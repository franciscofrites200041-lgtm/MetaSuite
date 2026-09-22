import Link from "next/link";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata = { title: "Configuración de Meta — Toruk AUGUR" };

// Meta OAuth diagnostics + setup checklist. Shows what's configured on the
// server side and what Francisco needs to configure on the Facebook App
// console side — with the exact URLs he needs to paste.
export default async function MetaSettingsPage() {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.includes("localhost") ? "http" : "https";
  const origin = `${proto}://${host}`;

  const appId = process.env.META_APP_ID ?? "";
  const appSecret = process.env.META_APP_SECRET ?? "";
  const redirectUri = process.env.META_OAUTH_REDIRECT_URI ?? "";
  const configId = process.env.META_LOGIN_CONFIG_ID ?? "";
  const encKey = process.env.META_TOKEN_ENC_KEY ?? "";
  const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const expectedRedirect = `${origin}/api/meta/callback`;
  const redirectMatches = redirectUri === expectedRedirect;
  const publicUrlMatches = publicAppUrl === origin;

  // Live probe of Meta's Graph API to verify the app_id is registered and
  // reachable. Anonymous endpoint — doesn't need a token. If this fails we
  // know the problem is on Meta's side (app disabled, wrong id, etc).
  const probe = await probeMetaApp(appId, appSecret);

  // Full OAuth URL that would be constructed on "Conectar Meta Ads". Users
  // can copy this into a browser to see the exact error Facebook returns
  // without going through the app. Business-asset permissions (ads_*,
  // business_management, pages_*) can't be requested as a raw `scope` param
  // anymore — Meta rejects them as "Invalid Scopes". They have to go through
  // Facebook Login for Business via config_id (see checklist item 6 below).
  const oauthUrl = appId && redirectUri && configId
    ? `https://www.facebook.com/v21.0/dialog/oauth?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&config_id=${encodeURIComponent(configId)}&response_type=code&state=DIAGNOSTIC`
    : null;

  const supabase = await supabaseServer();
  const { data: connections } = await supabase
    .from("meta_connections")
    .select("id, company_id, meta_ad_account_id, meta_page_id, status, token_expires_at, connected_at, last_error, companies(name, slug)")
    .order("connected_at", { ascending: false });

  return (
    <main className="min-h-screen py-14 px-6" style={{ background: "var(--color-canvas)" }}>
      <article className="max-w-[820px] mx-auto">
        <Link href="/app/settings" className="text-[11px] tracking-[0.16em] uppercase" style={{ color: "var(--color-ink-subtle)" }}>
          ← Configuración
        </Link>
        <h1
          className="mt-3 mb-2 text-[32px] leading-[1.1] tracking-tight"
          style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
        >
          Meta Ads
        </h1>
        <p className="mb-8 text-[14px]" style={{ color: "var(--color-ink-muted)" }}>
          Diagnóstico y checklist para conectar tu cuenta publicitaria de Meta.
        </p>

        {/* Env var status */}
        <Section title="1. Variables de entorno del servidor">
          <p className="text-[12px] mb-4" style={{ color: "var(--color-ink-subtle)" }}>
            Estas se cargan en Vercel → Project → Settings → Environment Variables. Después de tocar cualquiera, hay que redeployar.
          </p>
          <EnvRow name="META_APP_ID" value={appId} kind="public" hint="Se ve. Es tu App ID de la Facebook App." />
          <EnvRow name="META_APP_SECRET" value={appSecret} kind="secret" hint="No se muestra. Es el App Secret de la Facebook App." />
          <EnvRow name="META_OAUTH_REDIRECT_URI" value={redirectUri} kind="public" hint="Se ve. Debe matchear exacto la que ponés en el panel FB." />
          <EnvRow name="META_LOGIN_CONFIG_ID" value={configId} kind="public" hint="Se ve. El ID de la Configuration que creás en Facebook Login for Business (punto 6 del checklist)." />
          <EnvRow name="META_TOKEN_ENC_KEY" value={encKey} kind="secret" hint="No se muestra. 32 bytes hex (openssl rand -hex 32) para cifrar tokens." />
          <EnvRow name="NEXT_PUBLIC_APP_URL" value={publicAppUrl} kind="public" hint="URL pública de la app. Debe matchear el origin actual." />

          {!redirectMatches ? (
            <div className="mt-4 hairline rounded-md p-3 text-[13px]" style={{ background: "color-mix(in oklab, var(--color-warning) 10%, var(--color-surface-1))" }}>
              <strong>META_OAUTH_REDIRECT_URI no matchea el origin actual.</strong>
              <br />
              Actual: <code style={{ fontFamily: "var(--font-mono)" }}>{redirectUri || "(vacío)"}</code>
              <br />
              Esperado: <code style={{ fontFamily: "var(--font-mono)" }}>{expectedRedirect}</code>
            </div>
          ) : null}
          {!publicUrlMatches ? (
            <div className="mt-4 hairline rounded-md p-3 text-[13px]" style={{ background: "color-mix(in oklab, var(--color-warning) 10%, var(--color-surface-1))" }}>
              <strong>NEXT_PUBLIC_APP_URL no matchea el origin actual.</strong>
              <br />
              Actual: <code style={{ fontFamily: "var(--font-mono)" }}>{publicAppUrl || "(vacío)"}</code>
              <br />
              Esperado: <code style={{ fontFamily: "var(--font-mono)" }}>{origin}</code>
            </div>
          ) : null}
        </Section>

        {/* Live probe of the Meta app itself */}
        <Section title="2. ¿Meta ve tu app?">
          {probe === null ? (
            <p className="text-[13px]" style={{ color: "var(--color-ink-subtle)" }}>
              Cargá <code style={{ fontFamily: "var(--font-mono)" }}>META_APP_ID</code> en la sección 1 y esta prueba se activa.
            </p>
          ) : probe.ok ? (
            <div className="flex flex-col gap-2 text-[13px]">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--color-success)" }} />
                <span style={{ color: "var(--color-success)" }}>App visible en Meta</span>
              </div>
              <div style={{ color: "var(--color-ink-muted)" }}>
                Nombre: <strong style={{ color: "var(--color-ink)" }}>{probe.appName}</strong>
                {probe.category ? <> · Categoría: {probe.category}</> : null}
              </div>
              {probe.link ? (
                <a href={probe.link} target="_blank" rel="noopener" className="text-[12px] underline" style={{ color: "var(--color-ink-muted)" }}>
                  Página pública de la app →
                </a>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col gap-2 text-[13px]">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--color-danger)" }} />
                <span style={{ color: "var(--color-danger)" }}>Meta no reconoce este app_id</span>
              </div>
              <div style={{ color: "var(--color-ink-muted)" }}>{probe.error}</div>
              {!appSecret ? (
                <p className="text-[12px] mt-1" style={{ color: "var(--color-warning)" }}>
                  Ojo: falta <code style={{ fontFamily: "var(--font-mono)" }}>META_APP_SECRET</code>, así que esta prueba se hizo sin firmar (anónima) — Graph API rechaza casi cualquier consulta al nodo de la app sin token, incluso si el app_id es correcto. Cargá el secret arriba para que este resultado sea confiable.
                </p>
              ) : (
                <p className="text-[12px] mt-2" style={{ color: "var(--color-ink-subtle)" }}>
                  Posibles causas: app deshabilitada en el panel de FB, app_id o app_secret mal copiado (¿los mezclaste?), o el par app_id/app_secret no corresponde a la misma app.
                </p>
              )}
            </div>
          )}
        </Section>

        {/* OAuth URL preview */}
        {oauthUrl ? (
          <Section title="3. URL de OAuth que se manda a Facebook">
            <p className="text-[12px] mb-3" style={{ color: "var(--color-ink-subtle)" }}>
              Es exactamente la URL que se construye cuando apretás &quot;Conectar Meta Ads&quot;. Copiala y pegala en un browser incógnito para ver el error real que Facebook te devuelve sin pasar por nuestra app.
            </p>
            <CopyBox value={oauthUrl} />
          </Section>
        ) : null}

        {/* Redirect URI copy box */}
        <Section title="4. URI de redirección para pegar en Facebook">
          <p className="text-[12px] mb-3" style={{ color: "var(--color-ink-subtle)" }}>
            Copiala tal cual. Va en Facebook App → Facebook Login for Business → Settings → <strong>Valid OAuth Redirect URIs</strong>.
          </p>
          <CopyBox value={expectedRedirect} />
        </Section>

        {/* Setup checklist */}
        <Section title="5. Checklist del panel de Facebook Developer">
          <ol className="text-[13px] space-y-3 pl-5 list-decimal" style={{ color: "var(--color-ink-muted)" }}>
            <li>
              <strong>Tipo de app: Business.</strong> Los permisos de ads_management, business_management y pages_* solo se piden vía Facebook Login for Business, que requiere app tipo Business (no Consumer).
            </li>
            <li>
              <strong>App Roles → Administrators</strong>: agregate a vos mismo. Sin esto, ni siquiera vos podés loguear en dev mode.
            </li>
            <li>
              <strong>Settings → Basic</strong>: cargá Privacy Policy URL{" "}
              <code className="text-[11px]" style={{ fontFamily: "var(--font-mono)" }}>{origin}/privacy</code> y Terms of Service URL{" "}
              <code className="text-[11px]" style={{ fontFamily: "var(--font-mono)" }}>{origin}/terms</code>.
            </li>
            <li>
              <strong>Settings → Basic → App Domains</strong>: agregá el dominio sin protocolo:{" "}
              <code className="text-[11px]" style={{ fontFamily: "var(--font-mono)" }}>{host}</code>.
            </li>
            <li>
              <strong>Products → Facebook Login for Business → Settings</strong>: pegá la URL del punto 2 en <em>Valid OAuth Redirect URIs</em>. Guardar cambios.
            </li>
            <li>
              <strong>Products → Facebook Login for Business → Configurations</strong>: creá una configuración con permisos{" "}
              <code style={{ fontFamily: "var(--font-mono)" }}>ads_management</code>,{" "}
              <code style={{ fontFamily: "var(--font-mono)" }}>ads_read</code>,{" "}
              <code style={{ fontFamily: "var(--font-mono)" }}>business_management</code>,{" "}
              <code style={{ fontFamily: "var(--font-mono)" }}>pages_show_list</code>,{" "}
              <code style={{ fontFamily: "var(--font-mono)" }}>pages_read_engagement</code>,{" "}
              <code style={{ fontFamily: "var(--font-mono)" }}>pages_manage_ads</code>. Al guardarla, Facebook te muestra un{" "}
              <strong>Configuration ID</strong> numérico (también lo ves en la lista de Configurations). Copialo — es el{" "}
              <code style={{ fontFamily: "var(--font-mono)" }}>META_LOGIN_CONFIG_ID</code> que falta en la sección 1. Sin este
              paso, Facebook devuelve <em>&quot;Invalid Scopes&quot;</em> apenas tocás &quot;Conectar Meta Ads&quot;.
            </li>
            <li>
              <strong>App Review → Permissions and Features</strong>: en Dev mode no hace falta. Los admins/testers pueden usar todos los permisos con Standard Access. NO completes Business Verification hasta que quieras salir de Dev.
            </li>
            <li>
              <strong>Copiá App ID + App Secret + Configuration ID</strong> a Vercel → Environment Variables como{" "}
              <code style={{ fontFamily: "var(--font-mono)" }}>META_APP_ID</code>,{" "}
              <code style={{ fontFamily: "var(--font-mono)" }}>META_APP_SECRET</code> y{" "}
              <code style={{ fontFamily: "var(--font-mono)" }}>META_LOGIN_CONFIG_ID</code>. Redeploy.
            </li>
          </ol>
        </Section>

        {/* Live connections */}
        <Section title="6. Conexiones activas">
          {connections && connections.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {connections.map((c) => {
                const co = Array.isArray(c.companies) ? c.companies[0] : c.companies;
                const expires = c.token_expires_at ? new Date(c.token_expires_at) : null;
                const daysLeft = expires ? Math.round((expires.getTime() - Date.now()) / 86400000) : null;
                return (
                  <li key={c.id} className="hairline rounded-md p-3 flex items-center justify-between gap-4" style={{ background: "var(--color-surface-2)" }}>
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium truncate">{co?.name ?? c.company_id}</div>
                      <div className="text-[11px] mt-0.5" style={{ color: "var(--color-ink-subtle)", fontFamily: "var(--font-mono)" }}>
                        act_{c.meta_ad_account_id} · page {c.meta_page_id ?? "—"}
                      </div>
                      {c.last_error ? (
                        <div className="text-[11px] mt-1" style={{ color: "var(--color-danger)" }}>
                          Último error: {c.last_error}
                        </div>
                      ) : null}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[11px] tracking-wider uppercase" style={{ color: c.status === "active" ? "var(--color-success)" : "var(--color-danger)" }}>
                        {c.status}
                      </div>
                      {daysLeft !== null ? (
                        <div className="text-[11px] mt-0.5" style={{ color: "var(--color-ink-subtle)" }}>
                          expira en {daysLeft}d
                        </div>
                      ) : null}
                      {co?.slug ? (
                        <a
                          href={`/api/meta/oauth?company_id=${c.company_id}`}
                          className="inline-block mt-2 text-[11px] underline"
                          style={{ color: "var(--color-ink-muted)" }}
                        >
                          Reconectar
                        </a>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-[13px]" style={{ color: "var(--color-ink-subtle)" }}>
              Todavía no hay ninguna conexión de Meta guardada. Conectá desde el panel de una empresa.
            </p>
          )}
        </Section>
      </article>
    </main>
  );
}

type Probe =
  | { ok: true; appName: string; category?: string; link?: string }
  | { ok: false; error: string };

// Server-side ping to Meta's Graph API to check that META_APP_ID actually
// points at a registered, enabled app. The /{app-id} node isn't publicly
// readable without a token — even for perfectly valid apps — so we sign the
// request with the app access token (app_id|app_secret) instead of going
// fully anonymous. Meta returns app metadata for a registered app, or an
// error object if the id/secret pair is wrong or the app was disabled.
async function probeMetaApp(appId: string, appSecret: string): Promise<Probe | null> {
  if (!appId) return null;
  try {
    const url = new URL(`https://graph.facebook.com/v21.0/${encodeURIComponent(appId)}`);
    url.searchParams.set("fields", "name,category,link");
    if (appSecret) url.searchParams.set("access_token", `${appId}|${appSecret}`);
    const res = await fetch(url, { cache: "no-store" });
    const json = (await res.json()) as { name?: string; category?: string; link?: string; error?: { message: string } };
    if (json.error) return { ok: false, error: json.error.message };
    if (!json.name) return { ok: false, error: "Meta no devolvió metadata para este app_id" };
    return { ok: true, appName: json.name, category: json.category, link: json.link };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "network_error" };
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-[16px] tracking-tight" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>
        {title}
      </h2>
      <div className="hairline rounded-lg p-5" style={{ background: "var(--color-surface-1)" }}>
        {children}
      </div>
    </section>
  );
}

function EnvRow({ name, value, kind, hint }: { name: string; value: string; kind: "public" | "secret"; hint: string }) {
  const isSet = value.length > 0;
  const display = !isSet ? "(vacío)" : kind === "secret" ? `••• (${value.length} chars)` : value;
  return (
    <div className="flex items-start justify-between gap-4 py-2 hairline-b last:border-b-0">
      <div className="min-w-0">
        <div className="text-[12px] font-medium" style={{ fontFamily: "var(--font-mono)" }}>{name}</div>
        <div className="text-[11px] mt-0.5" style={{ color: "var(--color-ink-subtle)" }}>{hint}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-[11px] tracking-wider uppercase" style={{ color: isSet ? "var(--color-success)" : "var(--color-danger)" }}>
          {isSet ? "OK" : "falta"}
        </div>
        <div className="text-[11px] mt-0.5 truncate max-w-[300px]" style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-mono)" }}>
          {display}
        </div>
      </div>
    </div>
  );
}

function CopyBox({ value }: { value: string }) {
  return (
    <div
      className="hairline rounded-md px-3 py-2.5 text-[13px] select-all break-all"
      style={{ background: "var(--color-surface-2)", fontFamily: "var(--font-mono)" }}
    >
      {value}
    </div>
  );
}
