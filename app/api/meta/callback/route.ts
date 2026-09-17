import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { exchangeCodeForToken, exchangeForLongLived, listAdAccounts, listPages } from "@/lib/meta/graph";
import { encryptToken } from "@/lib/crypto";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errParam = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (errParam) return redirectHome(url, `Meta canceló la conexión: ${errParam}`);
  if (!code || !state) return redirectHome(url, "Faltan parámetros del OAuth.");

  const cookieState = request.cookies.get("meta_oauth_state")?.value;
  const companyId = request.cookies.get("meta_oauth_company")?.value;
  if (!cookieState || cookieState !== state || !companyId) {
    return redirectHome(url, "State inválido (posible CSRF). Reintentá.");
  }

  const supabase = await supabaseServer();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return NextResponse.redirect(new URL("/login", url.origin));

  const { data: company } = await supabase.from("companies").select("id, slug").eq("id", companyId).maybeSingle();
  if (!company) return redirectHome(url, "La empresa no existe o no es tuya.");

  // 1. Code → short-lived token
  const short = await exchangeCodeForToken(code);
  if (!short.ok) return redirectCompany(url, company.slug, `Meta rechazó el code: ${short.error}`);

  // 2. Short → long-lived (60d)
  const long = await exchangeForLongLived(short.data.access_token);
  const token = long.ok ? long.data.access_token : short.data.access_token;
  const expiresAt = long.ok ? new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString() : null;

  // 3. Pick first ad account + page. Multi-account picker → future work.
  const accounts = await listAdAccounts(token);
  if (!accounts.ok || accounts.data.data.length === 0) {
    return redirectCompany(url, company.slug, `Meta no devolvió ad accounts: ${accounts.ok ? "lista vacía" : accounts.error}`);
  }
  const primaryAccount = accounts.data.data[0];

  const pages = await listPages(token);
  const primaryPage = pages.ok ? pages.data.data[0] : null;

  // 4. Encrypt + upsert
  const enc = encryptToken(token);
  const { error: upsertErr } = await supabase
    .from("meta_connections")
    .upsert(
      {
        company_id: company.id,
        meta_ad_account_id: primaryAccount.account_id,
        meta_page_id: primaryPage?.id ?? null,
        meta_business_id: null,
        access_token_ciphertext: enc.ciphertext,
        access_token_iv: enc.iv,
        access_token_tag: enc.tag,
        token_expires_at: expiresAt,
        status: "active",
        last_error: null,
        connected_at: new Date().toISOString(),
      },
      { onConflict: "company_id" }
    );
  if (upsertErr) return redirectCompany(url, company.slug, `Error guardando conexión: ${upsertErr.message}`);

  const response = redirectCompany(url, company.slug, null);
  response.cookies.delete("meta_oauth_state");
  response.cookies.delete("meta_oauth_company");
  return response;
}

function redirectHome(url: URL, message: string) {
  const to = new URL("/app", url.origin);
  to.searchParams.set("meta_error", message);
  return NextResponse.redirect(to);
}
function redirectCompany(url: URL, slug: string, message: string | null) {
  const to = new URL(`/app/c/${slug}`, url.origin);
  if (message) to.searchParams.set("meta_error", message);
  else to.searchParams.set("meta_connected", "1");
  return NextResponse.redirect(to);
}
