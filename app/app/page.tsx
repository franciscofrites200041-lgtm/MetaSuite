import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export default async function AppHome() {
  const supabase = await supabaseServer();
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, slug")
    .order("created_at", { ascending: true });

  if (!companies || companies.length === 0) {
    return (
      <section className="max-w-[720px] mx-auto px-10 pt-16">
        <p
          className="mb-2 text-[11px] tracking-[0.14em] uppercase"
          style={{ color: "var(--color-ink-subtle)" }}
        >
          Bienvenido
        </p>
        <h1
          className="text-[36px] leading-[1.1] tracking-tight"
          style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
        >
          Vamos a dar de alta tu primera empresa.
        </h1>
        <p className="mt-4 text-[15px]" style={{ color: "var(--color-ink-muted)" }}>
          Cada empresa conecta su propia cuenta de Meta Ads y tiene sus propios objetivos de pauta.
          Si gestionás varias empresas —una agencia, por ejemplo— podés agregarlas todas después.
        </p>
        <Link
          href="/app/companies/new"
          className="mt-8 inline-block rounded-md px-4 py-2.5 text-[13px] font-medium"
          style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}
        >
          Crear empresa
        </Link>
      </section>
    );
  }

  // Default: send to the first company
  redirect(`/app/c/${companies[0].slug}`);
}
