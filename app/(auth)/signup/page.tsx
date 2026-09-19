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
    <div className="hairline rounded-lg p-8" style={{ background: "var(--color-surface-1)" }}>
      <p className="mb-2 text-[10px] tracking-[0.16em] uppercase" style={{ color: "var(--color-ink-subtle)" }}>
        Toruk AUGUR
      </p>
      <h1 className="mb-2 text-[24px] leading-tight tracking-tight" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>
        Crear cuenta.
      </h1>
      <p className="mb-7 text-[13px]" style={{ color: "var(--color-ink-muted)" }}>
        Vas a poder gestionar varias empresas —tuyas o de clientes— desde el mismo workspace.
      </p>
      <form action={signUpWithPassword} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] tracking-wide" style={{ color: "var(--color-ink-muted)" }}>
            Nombre completo
          </span>
          <input
            name="full_name"
            type="text"
            autoComplete="name"
            className="hairline rounded-md px-3 py-2.5 text-[14px] outline-none"
            style={{ background: "var(--color-surface-2)" }}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] tracking-wide" style={{ color: "var(--color-ink-muted)" }}>
            Email
          </span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="hairline rounded-md px-3 py-2.5 text-[14px] outline-none"
            style={{ background: "var(--color-surface-2)" }}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] tracking-wide" style={{ color: "var(--color-ink-muted)" }}>
            Contraseña
          </span>
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="hairline rounded-md px-3 py-2.5 text-[14px] outline-none"
            style={{ background: "var(--color-surface-2)" }}
          />
        </label>
        {sp.error ? (
          <p className="text-[12px]" style={{ color: "var(--color-danger)" }}>
            {sp.error}
          </p>
        ) : null}
        <SubmitButton className="mt-2 justify-center" pendingLabel="Creando cuenta…">
          Crear cuenta
        </SubmitButton>
      </form>
      <p className="mt-6 text-[13px]" style={{ color: "var(--color-ink-muted)" }}>
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="underline" style={{ color: "var(--color-ink)" }}>
          Ingresá
        </Link>
      </p>
    </div>
  );
}
