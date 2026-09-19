import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnvOk } from "./env";

// Routes that don't need an auth check. Skipping getUser() here saves a
// full Supabase round-trip (~150-500ms) per navigation to these paths.
const PUBLIC_PREFIXES = ["/login", "/signup", "/auth", "/preview", "/_next", "/favicon", "/api/meta/callback"];

function isPublic(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // No env configured → let pages surface the state, don't gate anything.
  if (!supabaseEnvOk()) return response;

  const { pathname } = request.nextUrl;
  const publicRoute = isPublic(pathname);

  // Fast path for public routes: no getUser round-trip, no cookie refresh.
  // Auth pages that need to redirect a logged-in user (/login, /signup) still
  // do their own check via supabaseServer() inside the page component.
  if (publicRoute && !pathname.startsWith("/api/")) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !publicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}
