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
    .select("id, name, slug, logo_url")
    .order("created_at", { ascending: true });

  return (
    <div className="min-h-screen flex" style={{ background: "var(--color-canvas)" }}>
      <Sidebar
        user={{ email: user.email ?? "", name: (user.user_metadata?.full_name as string) ?? null }}
        companies={companies ?? []}
      />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
