import Link from "next/link";
import { signInWithPassword } from "../actions";
import { supabaseEnvOk } from "@/lib/supabase/env";
import { SubmitButton } from "@/components/submit-button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const configured = supabaseEnvOk();

  return (
    <div>
      <p className="mb-2 text-[11px] tracking-[0.18em] uppercase" style={{ color: "var(--color-ink-subtle)" }}>
        Ingresar
      </p>
      <h2
        className="mb-2 text-[28px] leading-[1.05] tracking-tight"
        style={{ fontFamily: "var(--font-display)", fontWeight: 500, letterSpacing: "-0.01em" }}
      >
        Bienvenido de vuelta.
      </h2>
      <p className="mb-8 text-[14px]" style={{ color: "var(--color-ink-muted)" }}>
        Ingresá con tu email y contraseña.
      </p>

      {!configured ? (
        <div
          className="mb-5 hairline rounded-md px-3 py-2 text-[12px]"
          style={{
            background: "color-mix(in oklab, var(--color-warning) 10%, var(--color-surface-2))",
            color: "var(--color-warning)",
          }}
        >
          Este deploy todavía no tiene Supabase configurado. Estás viendo solo el diseño.
        </div>
      ) : null}

      <form action={signInWithPassword} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={sp.next ?? "/app"} />
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
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="auth-input"
          />
        </Field>
        {sp.error ? (
          <p className="text-[12px]" style={{ color: "var(--color-danger)" }}>
            {sp.error}
          </p>
        ) : null}
        <SubmitButton className="mt-3 w-full justify-center py-3" pendingLabel="Ingresando…">
          Entrar
        </SubmitButton>
      </form>

      <div className="mt-8 flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: "var(--color-hairline)" }} />
        <span className="text-[10px] tracking-[0.18em] uppercase" style={{ color: "var(--color-ink-tertiary)" }}>
          o
        </span>
        <div className="flex-1 h-px" style={{ background: "var(--color-hairline)" }} />
      </div>

      <p className="mt-6 text-[14px] text-center" style={{ color: "var(--color-ink-muted)" }}>
        ¿Todavía no tenés cuenta?{" "}
        <Link href="/signup" className="underline" style={{ color: "var(--color-ink)" }}>
          Crear cuenta
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
