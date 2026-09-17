import Link from "next/link";
import { signUpWithPassword } from "../actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;

  return (
    <div className="hairline rounded-lg p-8" style={{ background: "var(--color-surface-1)" }}>
      <h1 className="mb-1 text-[22px] leading-tight tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
        Crear cuenta
      </h1>
      <p className="mb-6 text-[13px]" style={{ color: "var(--color-ink-muted)" }}>
        Vas a poder gestionar varias empresas desde la misma cuenta.
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
        <button
          type="submit"
          className="mt-2 rounded-md px-4 py-2.5 text-[13px] font-medium"
          style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}
        >
          Crear cuenta
        </button>
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
