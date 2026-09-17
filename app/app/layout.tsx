import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, slug")
    .order("created_at", { ascending: true });

  return (
    <div className="min-h-screen flex" style={{ background: "var(--color-canvas)" }}>
      <Sidebar user={{ email: user.email ?? "", name: (user.user_metadata?.full_name as string) ?? null }} companies={companies ?? []}>
        <FooterLinks />
      </Sidebar>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

function FooterLinks() {
  return (
    <div className="flex flex-col gap-1 px-2 pb-3">
      <Link
        href="/app/settings"
        className="px-2 py-1.5 rounded-[6px] text-[13px]"
        style={{ color: "var(--color-ink-muted)" }}
      >
        Configuración
      </Link>
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="w-full text-left px-2 py-1.5 rounded-[6px] text-[13px]"
          style={{ color: "var(--color-ink-muted)" }}
        >
          Salir
        </button>
      </form>
    </div>
  );
}
