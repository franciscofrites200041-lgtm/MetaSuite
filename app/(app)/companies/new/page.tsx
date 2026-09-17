import { createCompany } from "../../actions";

export default function NewCompanyPage() {
  return (
    <section className="max-w-[640px] mx-auto px-10 pt-16">
      <p className="mb-2 text-[11px] tracking-[0.14em] uppercase" style={{ color: "var(--color-ink-subtle)" }}>
        Nueva empresa
      </p>
      <h1
        className="text-[32px] leading-[1.1] tracking-tight mb-8"
        style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
      >
        Datos básicos de la empresa.
      </h1>

      <form action={createCompany} className="flex flex-col gap-5">
        <Field label="Nombre" name="name" required />
        <Field label="Industria" name="industry" placeholder="Ej. Automotriz, Salud, Retail" />
        <Field
          label="Descripción corta"
          name="description"
          placeholder="Qué vende, a quién, en qué se diferencia."
          textarea
        />
        <button
          type="submit"
          className="mt-2 self-start rounded-md px-4 py-2.5 text-[13px] font-medium"
          style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}
        >
          Crear empresa
        </button>
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
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  textarea?: boolean;
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
          type="text"
          placeholder={placeholder}
          required={required}
          className="hairline rounded-md px-3 py-2.5 text-[14px] outline-none"
          style={{ background: "var(--color-surface-2)" }}
        />
      )}
    </label>
  );
}
