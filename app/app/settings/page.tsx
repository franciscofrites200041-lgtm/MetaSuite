import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function AccountSettings({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("account_members")
    .select("account_id, role, accounts!inner(id, name, default_publish_mode)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle<{
      account_id: string;
      role: string;
      accounts: { id: string; name: string; default_publish_mode: "auto" | "approval" } | { id: string; name: string; default_publish_mode: "auto" | "approval" }[];
    }>();
  const account = membership
    ? Array.isArray(membership.accounts)
      ? membership.accounts[0]
      : membership.accounts
    : null;
  if (!account) redirect("/app");

  // Members list via admin client — RLS on account_members is restrictive on read.
  const admin = supabaseAdmin();
  const { data: members } = await admin
    .from("account_members")
    .select("user_id, role, created_at")
    .eq("account_id", account.id);
  const userIds = (members ?? []).map((m) => m.user_id);
  const { data: authUsers } = userIds.length
    ? await admin.auth.admin.listUsers({ perPage: 100 })
    : { data: { users: [] } };
  const usersById = new Map(authUsers.users.map((u) => [u.id, u]));

  async function updateAccount(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    const defaultMode = String(formData.get("default_publish_mode") ?? "approval") as "auto" | "approval";
    if (!name) redirect("/app/settings?error=name");
    const supa = await supabaseServer();
    const { error } = await supa
      .from("accounts")
      .update({ name, default_publish_mode: defaultMode })
      .eq("id", account!.id);
    if (error) redirect(`/app/settings?error=${encodeURIComponent(error.message)}`);
    revalidatePath("/app/settings");
    redirect("/app/settings?saved=1");
  }

  async function updateProfile(formData: FormData) {
    "use server";
    const fullName = String(formData.get("full_name") ?? "").trim();
    const supa = await supabaseServer();
    const { error } = await supa.auth.updateUser({ data: { full_name: fullName || null } });
    if (error) redirect(`/app/settings?error=${encodeURIComponent(error.message)}`);
    revalidatePath("/app/settings");
    revalidatePath("/app");
    redirect("/app/settings?saved=1");
  }

  return (
    <section className="max-w-[720px] mx-auto px-10 pt-12 pb-24">
      <p className="mb-2 text-[11px] tracking-[0.14em] uppercase" style={{ color: "var(--color-ink-subtle)" }}>
        Configuración
      </p>
      <h1
        className="text-[32px] leading-[1.1] tracking-tight mb-8"
        style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
      >
        Cuenta y perfil.
      </h1>

      {sp.error ? <Banner tone="danger">{sp.error}</Banner> : null}
      {sp.saved ? <Banner tone="success">Cambios guardados.</Banner> : null}

      {/* Perfil del usuario */}
      <Card title="Tu perfil">
        <form action={updateProfile} className="flex flex-col gap-4">
          <Field label="Email">
            <input
              type="email"
              defaultValue={user.email ?? ""}
              disabled
              className="hairline rounded-md px-3 py-2.5 text-[14px] outline-none opacity-70"
              style={{ background: "var(--color-surface-2)" }}
            />
            <span className="text-[11px]" style={{ color: "var(--color-ink-subtle)" }}>
              Para cambiar el email, contactá al admin de la cuenta.
            </span>
          </Field>
          <Field label="Nombre completo">
            <input
              name="full_name"
              type="text"
              defaultValue={(user.user_metadata?.full_name as string) ?? ""}
              className="hairline rounded-md px-3 py-2.5 text-[14px] outline-none"
              style={{ background: "var(--color-surface-2)" }}
            />
          </Field>
          <SaveButton />
        </form>
      </Card>

      {/* Account */}
      <Card title="Cuenta (workspace)">
        <form action={updateAccount} className="flex flex-col gap-4">
          <Field label="Nombre de la cuenta">
            <input
              name="name"
              type="text"
              defaultValue={account.name}
              required
              className="hairline rounded-md px-3 py-2.5 text-[14px] outline-none"
              style={{ background: "var(--color-surface-2)" }}
            />
            <span className="text-[11px]" style={{ color: "var(--color-ink-subtle)" }}>
              Podés renombrarla cuando la uses para una agencia o para tu propio negocio.
            </span>
          </Field>
          <Field label="Modo de publicación por default">
            <select
              name="default_publish_mode"
              defaultValue={account.default_publish_mode}
              className="hairline rounded-md px-3 py-2.5 text-[14px] outline-none"
              style={{ background: "var(--color-surface-2)" }}
            >
              <option value="approval">Con aprobación (default seguro)</option>
              <option value="auto">Automático (la IA activa sin pedir permiso)</option>
            </select>
            <span className="text-[11px]" style={{ color: "var(--color-ink-subtle)" }}>
              Cada objetivo puede overridear este valor.
            </span>
          </Field>
          <SaveButton />
        </form>
      </Card>

      {/* Members */}
      <Card title="Miembros">
        <ul className="flex flex-col">
          {(members ?? []).map((m, i) => {
            const u = usersById.get(m.user_id);
            const isYou = m.user_id === user.id;
            return (
              <li
                key={m.user_id}
                className={`flex items-center justify-between py-3 ${i > 0 ? "hairline-t" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-8 w-8 rounded-full grid place-items-center text-[12px]"
                    style={{ background: "var(--color-surface-2)", color: "var(--color-ink-muted)", border: "1px solid var(--color-hairline)" }}
                  >
                    {(u?.user_metadata?.full_name as string)?.slice(0, 1)?.toUpperCase() ?? u?.email?.slice(0, 1)?.toUpperCase() ?? "?"}
                  </div>
                  <div>
                    <div className="text-[13px]">
                      {(u?.user_metadata?.full_name as string) ?? u?.email ?? m.user_id}
                      {isYou ? (
                        <span className="ml-2 text-[10px] tracking-wider uppercase" style={{ color: "var(--color-ink-subtle)" }}>
                          vos
                        </span>
                      ) : null}
                    </div>
                    <div className="text-[11px]" style={{ color: "var(--color-ink-subtle)" }}>
                      {u?.email ?? "—"}
                    </div>
                  </div>
                </div>
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] tracking-wider uppercase"
                  style={{ background: "var(--color-surface-2)", color: "var(--color-ink-muted)" }}
                >
                  {m.role}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-[12px]" style={{ color: "var(--color-ink-subtle)" }}>
          Invitar nuevos miembros por email se cablea en la siguiente iteración.
        </p>
      </Card>

      {/* Logout */}
      <Card title="Sesión">
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="hairline rounded-md px-3 py-2 text-[13px]"
            style={{ background: "var(--color-surface-2)", color: "var(--color-ink)" }}
          >
            Cerrar sesión
          </button>
        </form>
      </Card>

      <div className="mt-8 text-[12px]" style={{ color: "var(--color-ink-subtle)" }}>
        <Link href="/app" style={{ color: "var(--color-ink)" }} className="underline">
          ← Volver al dashboard
        </Link>
      </div>
    </section>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="hairline rounded-lg mb-6" style={{ background: "var(--color-surface-1)" }}>
      <header className="px-6 py-4 hairline-b">
        <h2 className="text-[14px] tracking-tight" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>
          {title}
        </h2>
      </header>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px]" style={{ color: "var(--color-ink-muted)" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function SaveButton() {
  return (
    <button
      type="submit"
      className="mt-2 self-start rounded-md px-4 py-2 text-[13px] font-medium"
      style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}
    >
      Guardar
    </button>
  );
}

function Banner({ tone, children }: { tone: "success" | "danger"; children: React.ReactNode }) {
  const color = tone === "success" ? "var(--color-success)" : "var(--color-danger)";
  return (
    <div
      className="mb-6 hairline rounded-md px-4 py-3 text-[13px]"
      style={{ background: `color-mix(in oklab, ${color} 8%, var(--color-surface-1))`, color }}
    >
      {children}
    </div>
  );
}
