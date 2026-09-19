import Link from "next/link";

export const metadata = {
  title: "Términos de servicio — Toruk AUGUR",
};

const UPDATED = "17 de septiembre de 2026";

export default function Terms() {
  return (
    <main className="min-h-screen py-16 px-6" style={{ background: "var(--color-canvas)" }}>
      <article className="max-w-[720px] mx-auto">
        <Link href="/" className="text-[11px] tracking-[0.16em] uppercase" style={{ color: "var(--color-ink-subtle)" }}>
          ← Toruk AUGUR
        </Link>
        <h1
          className="mt-4 mb-2 text-[36px] leading-[1.1] tracking-tight"
          style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
        >
          Términos de servicio
        </h1>
        <p className="mb-10 text-[13px]" style={{ color: "var(--color-ink-subtle)" }}>
          Última actualización: {UPDATED}
        </p>

        <Section title="1. Aceptación">
          <p>
            Al usar Toruk AUGUR aceptás estos términos. Si no estás de acuerdo, no uses el servicio.
          </p>
        </Section>

        <Section title="2. El servicio">
          <p>
            Toruk AUGUR es una herramienta que te permite operar tu cuenta de Meta Ads a través de una interfaz
            conversacional con inteligencia artificial. La app crea, edita, activa y pausa campañas, ad sets y
            ads en Meta en tu nombre, con tu autorización explícita.
          </p>
        </Section>

        <Section title="3. Tu cuenta">
          <p>
            Sos responsable de mantener la seguridad de tu cuenta y de las credenciales de Meta que conectás. La
            responsabilidad por el contenido de los ads que la app publica en tu cuenta de Meta es tuya —
            revisá el copy, la creatividad y la segmentación antes de aprobar.
          </p>
        </Section>

        <Section title="4. Uso aceptable">
          <ul className="list-disc pl-5 space-y-2">
            <li>No usar el servicio para actividades ilegales o que violen las políticas de Meta.</li>
            <li>No intentar acceder a datos de otras cuentas.</li>
            <li>No usar el servicio para spam, contenido engañoso, o violación de derechos de terceros.</li>
          </ul>
        </Section>

        <Section title="5. Facturación">
          <p>
            La versión MVP es gratuita mientras esté en fase piloto. Los costos de la publicidad en Meta corren
            por tu cuenta directamente contra tu cuenta publicitaria. Los tokens de la IA (OpenRouter) los
            paga Toruk durante la fase piloto.
          </p>
        </Section>

        <Section title="6. Cancelación">
          <p>
            Podés cancelar tu cuenta cuando quieras desde{" "}
            <Link href="/app/settings" className="underline" style={{ color: "var(--color-ink)" }}>
              /app/settings
            </Link>{" "}
            o escribiendo a la dirección de contacto. Nosotros podemos suspender cuentas que violen estos
            términos, con aviso previo salvo en casos graves.
          </p>
        </Section>

        <Section title="7. Limitación de responsabilidad">
          <p>
            El servicio se ofrece "tal cual". No garantizamos que las campañas generadas por la IA rindan de
            determinada manera. No somos responsables por decisiones de negocio tomadas en base a las
            recomendaciones de la IA. La responsabilidad final sobre lo publicado en Meta es del usuario.
          </p>
        </Section>

        <Section title="8. Cambios en los términos">
          <p>
            Podemos actualizar estos términos. Si los cambios son sustanciales, avisamos por email con al menos
            15 días de anticipación.
          </p>
        </Section>

        <Section title="9. Contacto">
          <p>
            Toruk Technologies — <a href="mailto:toruktec@gmail.com" className="underline" style={{ color: "var(--color-ink)" }}>toruktec@gmail.com</a>
          </p>
        </Section>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2
        className="mb-3 text-[18px] tracking-tight"
        style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
      >
        {title}
      </h2>
      <div className="text-[14px] leading-[1.7]" style={{ color: "var(--color-ink-muted)" }}>
        {children}
      </div>
    </section>
  );
}
