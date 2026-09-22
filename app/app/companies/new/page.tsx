import { createCompany } from "../../actions";
import { SubmitButton } from "@/components/submit-button";

const ERROR_MESSAGES: Record<string, string> = {
  nombre: "Falta el nombre de la empresa.",
  website_requerido: "Falta la URL del sitio web.",
  no_account: "Tu usuario no tiene una cuenta asociada todavía, así que no se pudo crear la empresa. Este es un problema del lado del servidor — contactá soporte o probá cerrar sesión y volver a entrar.",
};

export default async function NewCompanyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <section className="max-w-[720px] mx-auto px-10 pt-14 pb-24">
      <p className="mb-2 text-[11px] tracking-[0.14em] uppercase" style={{ color: "var(--color-ink-subtle)" }}>
        Nueva empresa
      </p>
      <h1
        className="text-[32px] leading-[1.1] tracking-tight mb-2"
        style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
      >
        Datos básicos de la empresa.
      </h1>
      <p className="mb-8 text-[14px]" style={{ color: "var(--color-ink-muted)" }}>
        Estos datos van al system prompt de la IA en cada conversación y al `object_story_spec`
        de cada ad. Cargarlos ahora te evita volver dos veces.
      </p>

      {error ? (
        <div
          className="mb-6 hairline rounded-md px-4 py-3 text-[13px]"
          style={{
            background: "color-mix(in oklab, var(--color-danger) 8%, var(--color-surface-1))",
            color: "var(--color-danger)",
          }}
        >
          {ERROR_MESSAGES[error] ?? `No se pudo crear la empresa: ${error}`}
        </div>
      ) : null}

      <form action={createCompany} className="flex flex-col gap-5" encType="multipart/form-data">
        <Field label="Nombre" name="name" required placeholder="Toruk Technologies" />
        <Field label="Industria" name="industry" placeholder="Ej. Automotriz, Salud, Retail" />
        <Field
          label="Descripción corta"
          name="description"
          placeholder="Qué vende, a quién, en qué se diferencia."
          textarea
        />
        <Field
          label="Sitio web"
          name="website_url"
          type="url"
          required
          placeholder="https://tu-sitio.com"
          hint="La IA scrapea el site para armar el brief general y analizar SEO. También va como landing de cada ad."
        />
        <Field
          label="Google Maps"
          name="google_maps_url"
          type="url"
          placeholder="https://maps.app.goo.gl/... o link directo de Maps"
          hint="Link 'Compartir' del negocio en Google Maps. La IA lo usa para el análisis GEO (rating, reviews, completitud del perfil). Dejalo vacío si el negocio es 100% online."
        />
        <label className="flex items-center gap-2 text-[12px]" style={{ color: "var(--color-ink-muted)" }}>
          <input
            type="checkbox"
            name="has_physical_location"
            defaultChecked
            className="h-3.5 w-3.5"
            style={{ accentColor: "var(--color-primary)" }}
          />
          Tiene local físico (activa el análisis GEO)
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px]" style={{ color: "var(--color-ink-muted)" }}>
            Logo (opcional)
          </span>
          <input
            name="logo"
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="text-[13px] file:hairline file:rounded-md file:px-3 file:py-1.5 file:text-[12px] file:mr-3 file:bg-[color:var(--color-surface-2)] file:cursor-pointer"
          />
          <span className="text-[11px]" style={{ color: "var(--color-ink-subtle)" }}>
            PNG, JPG, SVG o WEBP. Máx. 4MB.
          </span>
        </label>

        <SubmitButton className="mt-2 self-start" pendingLabel="Creando…">
          Crear empresa
        </SubmitButton>
      </form>
    </section>
  );
}

function Field({
  label,
  name,
  placeholder,
  required,
  textarea,
  type = "text",
  hint,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  textarea?: boolean;
  type?: string;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px]" style={{ color: "var(--color-ink-muted)" }}>
        {label}
        {required ? " *" : ""}
      </span>
      {textarea ? (
        <textarea
          name={name}
          placeholder={placeholder}
          rows={4}
          required={required}
          className="hairline rounded-md px-3 py-2.5 text-[14px] outline-none resize-y"
          style={{ background: "var(--color-surface-2)", fontFamily: "var(--font-sans)" }}
        />
      ) : (
        <input
          name={name}
          type={type}
          placeholder={placeholder}
          required={required}
          className="hairline rounded-md px-3 py-2.5 text-[14px] outline-none"
          style={{ background: "var(--color-surface-2)" }}
        />
      )}
      {hint ? (
        <span className="text-[11px]" style={{ color: "var(--color-ink-subtle)" }}>
          {hint}
        </span>
      ) : null}
    </label>
  );
}
