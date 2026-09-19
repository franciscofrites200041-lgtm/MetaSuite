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
    <div className="hairline rounded-lg p-8" style={{ background: "var(--color-surface-1)" }}>
      <p className="mb-2 text-[10px] tracking-[0.16em] uppercase" style={{ color: "var(--color-ink-subtle)" }}>
        Toruk AUGUR
      </p>
      <h1 className="mb-2 text-[24px] leading-tight tracking-tight" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>
        Pauta Meta operada por IA.
      </h1>
      <p className="mb-7 text-[13px]" style={{ color: "var(--color-ink-muted)" }}>
        Ingresá para operar tus campañas desde una conversación.
      </p>
      {!configured ? (
        <div
          className="mb-4 hairline rounded-md px-3 py-2 text-[12px]"
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
            autoComplete="current-password"
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
        <SubmitButton className="mt-2 justify-center" pendingLabel="Ingresando…">
          Entrar
        </SubmitButton>
      </form>
      <p className="mt-6 text-[13px]" style={{ color: "var(--color-ink-muted)" }}>
        ¿Todavía no tenés cuenta?{" "}
        <Link href="/signup" className="underline" style={{ color: "var(--color-ink)" }}>
          Registrate
        </Link>
      </p>
    </div>
  );
}
