import Link from "next/link";

export default function NotFound() {
  return (
    <main
      className="min-h-screen grid place-items-center px-6"
      style={{ background: "var(--color-canvas)" }}
    >
      <div className="text-center max-w-[440px]">
        <p className="mb-3 text-[11px] tracking-[0.16em] uppercase" style={{ color: "var(--color-ink-subtle)" }}>
          Toruk AUGUR
        </p>
        <h1
          className="text-[40px] leading-[1.05] tracking-tight mb-3"
          style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
        >
          Esta página no existe.
        </h1>
        <p className="mb-8 text-[14px]" style={{ color: "var(--color-ink-muted)" }}>
          Puede que el link esté viejo, o que hayamos movido algo. Volvé al inicio y seguimos.
        </p>
        <Link
          href="/"
          className="inline-block rounded-md px-4 py-2.5 text-[13px] font-medium"
          style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
