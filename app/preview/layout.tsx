import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

// Preview shell — mimics the (app) dashboard chrome but with mock data
// and NO auth. Public route. Not for production.
const MOCK_COMPANIES = [
  { id: "1", name: "Surmotors", slug: "surmotors" },
  { id: "2", name: "Café Bosco", slug: "cafe-bosco" },
];

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex" style={{ background: "var(--color-canvas)" }}>
      <aside
        className="w-[240px] shrink-0 flex flex-col hairline-r"
        style={{ background: "var(--color-surface-1)" }}
      >
        <div className="px-4 pt-5 pb-4">
          <Wordmark text="Toruk AUGUR" size="sm" />
        </div>

        <nav className="flex-1 overflow-y-auto px-2">
          <div className="px-2 pt-4 pb-1 text-[10px] tracking-wider uppercase" style={{ color: "var(--color-ink-tertiary)" }}>
            Empresas · demo
          </div>
          <ul className="flex flex-col gap-0.5">
            {MOCK_COMPANIES.map((c, i) => (
              <li key={c.id}>
                <Link
                  href={`/preview/c/${c.slug}`}
                  className="flex items-center justify-between px-2 py-1.5 rounded-[6px] text-[13px]"
                  style={{
                    background: i === 0 ? "color-mix(in oklab, var(--color-primary) 8%, transparent)" : "transparent",
                    color: i === 0 ? "var(--color-primary)" : "var(--color-ink-muted)",
                    fontWeight: i === 0 ? 500 : 400,
                  }}
                >
                  <span className="truncate">{c.name}</span>
                </Link>
              </li>
            ))}
            <li className="mt-1">
              <span className="flex items-center gap-1.5 px-2 py-1.5 rounded-[6px] text-[13px] opacity-60" style={{ color: "var(--color-ink-subtle)" }}>
                <span aria-hidden>+</span>
                <span>Nueva empresa</span>
              </span>
            </li>
          </ul>
        </nav>

        <div className="mt-auto">
          <div className="hairline-t px-4 py-3">
            <div className="text-[12px] truncate" style={{ color: "var(--color-ink)" }}>
              Preview
            </div>
            <div className="text-[11px] truncate" style={{ color: "var(--color-ink-subtle)" }}>
              sin auth · sin datos reales
            </div>
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
