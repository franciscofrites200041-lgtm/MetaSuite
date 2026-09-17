import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { supabaseServer } from "@/lib/supabase/server";

const SCOPES = [
  "ads_management",
  "ads_read",
  "business_management",
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_ads",
  "email",
  "public_profile",
].join(",");

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const companyId = url.searchParams.get("company_id");
  if (!companyId) return NextResponse.json({ error: "missing_company_id" }, { status: 400 });

  const supabase = await supabaseServer();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return NextResponse.redirect(new URL("/login", url.origin));

  // Verify user has access to this company (RLS will filter).
  const { data: company } = await supabase.from("companies").select("id, slug").eq("id", companyId).maybeSingle();
  if (!company) return NextResponse.json({ error: "company_not_found_or_forbidden" }, { status: 404 });

  const appId = process.env.META_APP_ID;
  const redirectUri = process.env.META_OAUTH_REDIRECT_URI;
  if (!appId || !redirectUri) return NextResponse.json({ error: "meta_oauth_not_configured" }, { status: 501 });

  const state = randomBytes(24).toString("hex");
  const fbUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  fbUrl.searchParams.set("client_id", appId);
  fbUrl.searchParams.set("redirect_uri", redirectUri);
  fbUrl.searchParams.set("scope", SCOPES);
  fbUrl.searchParams.set("state", state);
  fbUrl.searchParams.set("response_type", "code");

  const response = NextResponse.redirect(fbUrl);
  // Bind state + company_id to the browser via short-lived signed cookie (10 min).
  response.cookies.set("meta_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  response.cookies.set("meta_oauth_company", company.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
