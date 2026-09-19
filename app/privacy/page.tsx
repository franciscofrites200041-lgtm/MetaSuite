import Link from "next/link";

export const metadata = {
  title: "Política de privacidad — Toruk AUGUR",
};

const UPDATED = "17 de septiembre de 2026";

export default function PrivacyPolicy() {
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
          Política de privacidad
        </h1>
        <p className="mb-10 text-[13px]" style={{ color: "var(--color-ink-subtle)" }}>
          Última actualización: {UPDATED}
        </p>

        <Section title="1. Qué es Toruk AUGUR">
          <p>
            Toruk AUGUR es una herramienta operada por Toruk Technologies que permite a profesionales y PYMEs
            gestionar campañas publicitarias en Meta Ads a través de una interfaz conversacional con IA. Esta
            política describe qué datos recolectamos, cómo los usamos y con quién los compartimos.
          </p>
        </Section>

        <Section title="2. Qué datos recolectamos">
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Datos de cuenta:</strong> email y nombre que cargás en el registro. Los guardamos en
              Supabase (proveedor de auth y base de datos).
            </li>
            <li>
              <strong>Datos de las empresas que gestionás:</strong> nombre, industria, descripción, sitio web,
              logo y contenido de los briefs de campaña. Se guardan en tu workspace, no son públicos.
            </li>
            <li>
              <strong>Tokens de acceso a Meta:</strong> cuando conectás una cuenta de Meta Ads, guardamos el
              access token encriptado (AES-256-GCM) para poder operar tu cuenta publicitaria. No leemos ni
              compartimos tus tokens.
            </li>
            <li>
              <strong>Historial de conversación con la IA:</strong> los mensajes de tus chats se guardan
              asociados a cada objetivo, para que la IA pueda mantener contexto.
            </li>
            <li>
              <strong>Imágenes de creatividades:</strong> las imágenes que subís para los ads se guardan en
              Supabase Storage y se cargan a Meta como AdImages.
            </li>
          </ul>
        </Section>

        <Section title="3. Cómo usamos los datos">
          <ul className="list-disc pl-5 space-y-2">
            <li>Para operar tu cuenta publicitaria en Meta Ads — crear campañas, ad sets, ads, subir imágenes, activar y pausar.</li>
            <li>Para darle contexto a la IA en tus conversaciones (empresa, brief, historial).</li>
            <li>Para autenticarte y darte acceso solo a los datos que te pertenecen (Row Level Security en Supabase).</li>
          </ul>
          <p className="mt-4">
            No vendemos ni cedemos tus datos a terceros para marketing. No usamos tus datos para entrenar modelos.
          </p>
        </Section>

        <Section title="4. Con quién compartimos datos">
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Supabase</strong> — base de datos, autenticación y storage. Contrato de tratamiento de
              datos vigente.
            </li>
            <li>
              <strong>Meta Platforms</strong> — cuando pedís crear una campaña, enviamos el copy, prompt, imagen
              y configuración a la API de Meta Ads.
            </li>
            <li>
              <strong>OpenRouter</strong> — enrutador de modelos de IA. Recibe el contenido de tu chat para
              procesarlo con el modelo que elegiste (Claude, GPT, Gemini, Llama).
            </li>
            <li>
              <strong>Vercel</strong> — proveedor de hosting. Procesa cada request HTTP.
            </li>
          </ul>
        </Section>

        <Section title="5. Retención y borrado">
          <p>
            Tus datos se conservan mientras tu cuenta esté activa. Podés pedir el borrado escribiendo a la
            dirección de contacto de abajo. Cuando borrás tu cuenta, borramos también tus empresas, objetivos,
            chats, creatividades y tokens de Meta en un plazo de 30 días.
          </p>
        </Section>

        <Section title="6. Seguridad">
          <ul className="list-disc pl-5 space-y-2">
            <li>Tokens de Meta encriptados con AES-256-GCM antes de guardarse.</li>
            <li>Row Level Security en toda la base — un usuario solo ve los datos de sus cuentas.</li>
            <li>HTTPS obligatorio en todas las conexiones.</li>
            <li>Sesiones manejadas por Supabase Auth con rotación de refresh tokens.</li>
          </ul>
        </Section>

        <Section title="7. Tus derechos">
          <p>
            Tenés derecho a acceder, rectificar, borrar y exportar tus datos personales. También podés revocar
            el acceso a tu cuenta de Meta Ads desde{" "}
            <a href="https://www.facebook.com/settings?tab=business_tools" className="underline" style={{ color: "var(--color-ink)" }}>
              Configuración → Herramientas empresariales
            </a>{" "}
            en Facebook.
          </p>
        </Section>

        <Section title="8. Contacto">
          <p>
            Toruk Technologies — <a href="mailto:toruktec@gmail.com" className="underline" style={{ color: "var(--color-ink)" }}>toruktec@gmail.com</a>
          </p>
        </Section>

        <div className="mt-16 hairline-t pt-6 text-[12px]" style={{ color: "var(--color-ink-subtle)" }}>
          Documento vivo. Si algo cambia sustancialmente, avisamos por email a los usuarios activos antes de
          que entre en vigor.
        </div>
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
