import Link from "next/link";
import { signInWithPassword } from "../actions";
import { supabaseEnvOk } from "@/lib/supabase/env";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const configured = supabaseEnvOk();

  return (
    <div className="hairline rounded-lg p-8" style={{ background: "var(--color-surface-1)" }}>
      <h1 className="mb-1 text-[22px] leading-tight tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
        Ingresar
      </h1>
      <p className="mb-6 text-[13px]" style={{ color: "var(--color-ink-muted)" }}>
        Usá el email con el que te diste de alta.
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
        <button
          type="submit"
          className="mt-2 rounded-md px-4 py-2.5 text-[13px] font-medium"
          style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}
        >
          Entrar
        </button>
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
