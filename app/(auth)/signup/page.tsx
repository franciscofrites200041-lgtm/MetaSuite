import Link from "next/link";
import { signUpWithPassword } from "../actions";
import { SubmitButton } from "@/components/submit-button";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;

  return (
    <div>
      <p className="mb-2 text-[11px] tracking-[0.18em] uppercase" style={{ color: "var(--color-ink-subtle)" }}>
        Crear cuenta
      </p>
      <h2
        className="mb-2 text-[28px] leading-[1.05] tracking-tight"
        style={{ fontFamily: "var(--font-display)", fontWeight: 500, letterSpacing: "-0.01em" }}
      >
        Empezá a operar en Meta.
      </h2>
      <p className="mb-8 text-[14px]" style={{ color: "var(--color-ink-muted)" }}>
        Vas a poder gestionar varias empresas —tuyas o de clientes— desde el mismo workspace.
      </p>

      <form action={signUpWithPassword} className="flex flex-col gap-4">
        <Field label="Nombre completo">
          <input
            name="full_name"
            type="text"
            autoComplete="name"
            placeholder="Nombre y apellido"
            className="auth-input"
          />
        </Field>
        <Field label="Email">
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="vos@empresa.com"
            className="auth-input"
          />
        </Field>
        <Field label="Contraseña">
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            placeholder="Mínimo 8 caracteres"
            className="auth-input"
          />
        </Field>
        {sp.error ? (
          <p className="text-[12px]" style={{ color: "var(--color-danger)" }}>
            {sp.error}
          </p>
        ) : null}
        <SubmitButton className="mt-3 w-full justify-center py-3" pendingLabel="Creando cuenta…">
          Crear cuenta
        </SubmitButton>
      </form>

      <p className="mt-6 text-[12px] text-center" style={{ color: "var(--color-ink-subtle)" }}>
        Al crear una cuenta aceptás los{" "}
        <Link href="/terms" className="underline">
          Términos
        </Link>{" "}
        y la{" "}
        <Link href="/privacy" className="underline">
          Política de privacidad
        </Link>
        .
      </p>

      <div className="mt-8 flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: "var(--color-hairline)" }} />
        <span className="text-[10px] tracking-[0.18em] uppercase" style={{ color: "var(--color-ink-tertiary)" }}>
          o
        </span>
        <div className="flex-1 h-px" style={{ background: "var(--color-hairline)" }} />
      </div>

      <p className="mt-6 text-[14px] text-center" style={{ color: "var(--color-ink-muted)" }}>
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="underline" style={{ color: "var(--color-ink)" }}>
          Ingresar
        </Link>
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] tracking-wide uppercase" style={{ color: "var(--color-ink-muted)" }}>
        {label}
      </span>
      {children}
    </label>
  );
}
