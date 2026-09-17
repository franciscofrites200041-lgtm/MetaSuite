import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptToken } from "@/lib/crypto";

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export type MetaConn = {
  ad_account_id: string;
  page_id: string | null;
  access_token: string;
};

/** Fetches + decrypts the Meta connection for a company. Returns null if not connected. */
export async function getMetaConnection(
  supabase: SupabaseClient,
  companyId: string
): Promise<MetaConn | null> {
  const { data } = await supabase
    .from("meta_connections")
    .select("meta_ad_account_id, meta_page_id, access_token_ciphertext, access_token_iv, access_token_tag, status")
    .eq("company_id", companyId)
    .maybeSingle();
  if (!data || data.status !== "active") return null;

  const access_token = decryptToken(
    data.access_token_ciphertext as string,
    data.access_token_iv as string,
    data.access_token_tag as string
  );
  return {
    ad_account_id: data.meta_ad_account_id,
    page_id: data.meta_page_id,
    access_token,
  };
}

type GraphResponse<T> = { ok: true; data: T } | { ok: false; error: string; code?: number };

async function graphPost<T>(
  path: string,
  token: string,
  body: Record<string, unknown>
): Promise<GraphResponse<T>> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) {
    params.set(k, typeof v === "string" ? v : JSON.stringify(v));
  }
  params.set("access_token", token);
  const res = await fetch(`${GRAPH_BASE}${path}`, { method: "POST", body: params });
  const json = (await res.json()) as { id?: string; error?: { message: string; code: number } };
  if (!res.ok || json.error) {
    return { ok: false, error: json.error?.message ?? "graph_error", code: json.error?.code };
  }
  return { ok: true, data: json as T };
}

async function graphGet<T>(path: string, token: string, query: Record<string, string> = {}): Promise<GraphResponse<T>> {
  const url = new URL(`${GRAPH_BASE}${path}`);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  url.searchParams.set("access_token", token);
  const res = await fetch(url);
  const json = (await res.json()) as { error?: { message: string; code: number } };
  if (!res.ok || (json as { error?: unknown }).error) {
    const err = (json as { error?: { message: string; code: number } }).error;
    return { ok: false, error: err?.message ?? "graph_error", code: err?.code };
  }
  return { ok: true, data: json as T };
}

/* ─────────────────────────  Campaign / Ad Set  ───────────────────────── */

export async function createCampaign(
  conn: MetaConn,
  input: { name: string; objective: string; status: "ACTIVE" | "PAUSED" }
): Promise<GraphResponse<{ id: string }>> {
  return graphPost<{ id: string }>(`/act_${conn.ad_account_id}/campaigns`, conn.access_token, {
    name: input.name,
    objective: input.objective,
    status: input.status,
    special_ad_categories: [],
    buying_type: "AUCTION",
  });
}

export async function createAdSet(
  conn: MetaConn,
  input: {
    name: string;
    campaign_id: string;
    daily_budget_cents: number;
    targeting: Record<string, unknown>;
    status: "ACTIVE" | "PAUSED";
    optimization_goal: string;
    billing_event: string;
  }
): Promise<GraphResponse<{ id: string }>> {
  return graphPost<{ id: string }>(`/act_${conn.ad_account_id}/adsets`, conn.access_token, {
    name: input.name,
    campaign_id: input.campaign_id,
    daily_budget: input.daily_budget_cents,
    targeting: input.targeting,
    status: input.status,
    optimization_goal: input.optimization_goal,
    billing_event: input.billing_event,
    start_time: new Date().toISOString(),
  });
}

/* ─────────────────────────  Status changes  ───────────────────────── */

export async function updateMetaEntityStatus(
  supabase: SupabaseClient,
  companyId: string,
  entityId: string,
  status: "ACTIVE" | "PAUSED"
): Promise<GraphResponse<{ success: boolean }>> {
  const conn = await getMetaConnection(supabase, companyId);
  if (!conn) return { ok: false, error: "meta_not_connected" };
  return graphPost<{ success: boolean }>(`/${entityId}`, conn.access_token, { status });
}

/* ─────────────────────────  OAuth helpers  ───────────────────────── */

export async function exchangeCodeForToken(code: string): Promise<
  GraphResponse<{ access_token: string; token_type: string; expires_in?: number }>
> {
  const url = new URL(`${GRAPH_BASE}/oauth/access_token`);
  url.searchParams.set("client_id", process.env.META_APP_ID ?? "");
  url.searchParams.set("client_secret", process.env.META_APP_SECRET ?? "");
  url.searchParams.set("redirect_uri", process.env.META_OAUTH_REDIRECT_URI ?? "");
  url.searchParams.set("code", code);
  const res = await fetch(url);
  const json = (await res.json()) as { access_token?: string; error?: { message: string } };
  if (!res.ok || !json.access_token) return { ok: false, error: json.error?.message ?? "oauth_exchange_failed" };
  return { ok: true, data: json as { access_token: string; token_type: string; expires_in?: number } };
}

/** Trades a short-lived user token for a 60-day one. */
export async function exchangeForLongLived(shortToken: string): Promise<GraphResponse<{ access_token: string }>> {
  const url = new URL(`${GRAPH_BASE}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", process.env.META_APP_ID ?? "");
  url.searchParams.set("client_secret", process.env.META_APP_SECRET ?? "");
  url.searchParams.set("fb_exchange_token", shortToken);
  const res = await fetch(url);
  const json = (await res.json()) as { access_token?: string; error?: { message: string } };
  if (!res.ok || !json.access_token) return { ok: false, error: json.error?.message ?? "long_lived_failed" };
  return { ok: true, data: { access_token: json.access_token } };
}

export async function listAdAccounts(token: string): Promise<GraphResponse<{ data: Array<{ id: string; account_id: string; name: string; currency: string }> }>> {
  return graphGet(`/me/adaccounts`, token, { fields: "account_id,name,currency" });
}

export async function listPages(token: string): Promise<GraphResponse<{ data: Array<{ id: string; name: string }> }>> {
  return graphGet(`/me/accounts`, token, { fields: "id,name,access_token" });
}
