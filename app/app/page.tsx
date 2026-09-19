import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

type Step = {
  key: string;
  title: string;
  desc: string;
  done: boolean;
  href: string;
  cta: string;
};

export default async function AppHome() {
  const supabase = await supabaseServer();
  const { data: user } = await supabase.auth.getUser();

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, slug, industry, description, logo_url, website_url")
    .order("created_at", { ascending: true });

  // First-time user with no companies: rich welcome + guided path.
  if (!companies || companies.length === 0) {
    return (
      <section className="max-w-[880px] mx-auto px-10 pt-16 pb-24">
        <p className="mb-3 text-[11px] tracking-[0.14em] uppercase" style={{ color: "var(--color-ink-subtle)" }}>
          Bienvenido{user.user?.user_metadata?.full_name ? `, ${user.user.user_metadata.full_name}` : ""}
        </p>
        <h1
          className="text-[40px] leading-[1.05] tracking-tight mb-4"
          style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
        >
          Configurá tu primera empresa para empezar a pautar.
        </h1>
        <p className="mb-10 text-[16px] max-w-[640px]" style={{ color: "var(--color-ink-muted)" }}>
          AUGUR opera cuentas Meta Ads a través de una conversación. Vamos a dejar todo listo en 3 pasos.
          No hace falta que sepas nada de la API de Meta.
        </p>

        <ol className="flex flex-col gap-3">
          <StepCard
            n={1}
            title="Alta de empresa"
            desc="Nombre, industria, descripción, sitio web y logo. Todos los ads futuros usan estos datos como contexto."
            active
            href="/app/companies/new"
            cta="Crear empresa"
          />
          <StepCard
            n={2}
            title="Conectar Meta Ads"
            desc="Login con Facebook. Elegimos automáticamente tu primera cuenta publicitaria y página."
            disabled
          />
          <StepCard
            n={3}
            title="Primer objetivo"
            desc="Chat con la IA para armar el brief, generar creativas y publicar la campaña."
            disabled
          />
        </ol>
      </section>
    );
  }

  // Existing user: show checklist for first company, or redirect if fully set up.
  const first = companies[0];
  const [{ data: metaConn }, { count: objectivesCount }] = await Promise.all([
    supabase.from("meta_connections").select("id, status").eq("company_id", first.id).maybeSingle(),
    supabase.from("objectives").select("*", { count: "exact", head: true }).eq("company_id", first.id),
  ]);

  const steps: Step[] = [
    {
      key: "company",
      title: `Empresa "${first.name}"`,
      desc: "Datos básicos cargados.",
      done: true,
      href: `/app/c/${first.slug}/settings`,
      cta: "Editar",
    },
    {
      key: "details",
      title: "Website + logo de la empresa",
      desc: "Meta necesita la URL del sitio como landing y el logo aparece en la sidebar.",
      done: !!first.website_url && !!first.logo_url,
      href: `/app/c/${first.slug}/settings`,
      cta: "Completar",
    },
    {
      key: "meta",
      title: "Conectar Meta Ads",
      desc: "Facebook Login for Business para operar tu cuenta publicitaria.",
      done: !!metaConn && metaConn.status === "active",
      href: `/app/c/${first.slug}`,
      cta: "Conectar",
    },
    {
      key: "objective",
      title: "Crear el primer objetivo de pauta",
      desc: "Un objetivo = un chat con la IA + un brief + las campañas que salen de ahí.",
      done: (objectivesCount ?? 0) > 0,
      href: `/app/c/${first.slug}/objectives/new`,
      cta: "Nuevo objetivo",
    },
  ];

  const allDone = steps.every((s) => s.done);
  if (allDone) redirect(`/app/c/${first.slug}`);

  const nextStep = steps.find((s) => !s.done);

  return (
    <section className="max-w-[880px] mx-auto px-10 pt-12 pb-24">
      <p className="mb-2 text-[11px] tracking-[0.14em] uppercase" style={{ color: "var(--color-ink-subtle)" }}>
        Setup de {first.name}
      </p>
      <h1
        className="text-[32px] leading-[1.1] tracking-tight mb-2"
        style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
      >
        Terminemos de configurar la cuenta.
      </h1>
      <p className="mb-8 text-[14px]" style={{ color: "var(--color-ink-muted)" }}>
        Cuando termines los 4 pasos, entrás directo al dashboard de la empresa cada vez que abras AUGUR.
      </p>

      <ol className="flex flex-col gap-3">
        {steps.map((s, i) => (
          <StepCard
            key={s.key}
            n={i + 1}
            title={s.title}
            desc={s.desc}
            done={s.done}
            active={s === nextStep}
            href={s.href}
            cta={s.cta}
          />
        ))}
      </ol>

      {companies.length > 1 ? (
        <div className="mt-10 hairline-t pt-6 text-[13px]" style={{ color: "var(--color-ink-muted)" }}>
          Otras empresas de esta cuenta:{" "}
          {companies.slice(1).map((c, i) => (
            <span key={c.id}>
              <Link href={`/app/c/${c.slug}`} className="underline" style={{ color: "var(--color-ink)" }}>
                {c.name}
              </Link>
              {i < companies.length - 2 ? ", " : ""}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function StepCard({
  n,
  title,
  desc,
  done,
  active,
  disabled,
  href,
  cta,
}: {
  n: number;
  title: string;
  desc: string;
  done?: boolean;
  active?: boolean;
  disabled?: boolean;
  href?: string;
  cta?: string;
}) {
  const bg = active ? "var(--color-surface-2)" : "var(--color-surface-1)";
  const opacity = disabled ? 0.5 : 1;
  return (
    <li
      className="hairline rounded-lg px-5 py-4 flex items-center gap-5"
      style={{ background: bg, opacity }}
    >
      <div
        className="shrink-0 h-8 w-8 rounded-full grid place-items-center text-[13px] font-medium"
        style={{
          background: done ? "var(--color-success)" : active ? "var(--color-primary)" : "var(--color-surface-2)",
          color: done || active ? "var(--color-on-primary)" : "var(--color-ink-muted)",
          border: done || active ? "none" : "1px solid var(--color-hairline)",
        }}
      >
        {done ? "✓" : n}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[15px]" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>
          {title}
        </div>
        <div className="text-[13px] mt-0.5" style={{ color: "var(--color-ink-muted)" }}>
          {desc}
        </div>
      </div>
      {href && cta ? (
        <Link
          href={href}
          className="shrink-0 rounded-md px-3 py-1.5 text-[12px] font-medium"
          style={
            active
              ? { background: "var(--color-primary)", color: "var(--color-on-primary)" }
              : { background: "var(--color-surface-2)", color: "var(--color-ink-muted)", border: "1px solid var(--color-hairline)" }
          }
        >
          {cta}
        </Link>
      ) : null}
    </li>
  );
}
