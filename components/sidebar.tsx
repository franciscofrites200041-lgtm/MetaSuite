"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Company = { id: string; name: string; slug: string };

export function Sidebar({
  user,
  companies,
  children,
}: {
  user: { email: string; name: string | null };
  companies: Company[];
  children?: React.ReactNode;
}) {
  const pathname = usePathname();
  const activeSlug = pathname.startsWith("/app/c/") ? pathname.split("/")[3] : null;

  return (
    <aside
      className="w-[240px] shrink-0 flex flex-col hairline-r"
      style={{ background: "var(--color-surface-1)" }}
    >
      <div className="px-4 pt-5 pb-4 flex items-center gap-2">
        <span aria-hidden className="inline-block h-4 w-4 rounded-[3px]" style={{ background: "var(--color-primary)" }} />
        <span className="font-medium tracking-tight text-[15px]" style={{ fontFamily: "var(--font-display)" }}>
          Toruk AUGUR
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2">
        <div className="px-2 pt-4 pb-1 text-[10px] tracking-wider uppercase" style={{ color: "var(--color-ink-tertiary)" }}>
          Empresas
        </div>
        <ul className="flex flex-col gap-0.5">
          {companies.length === 0 ? (
            <li className="px-2 py-1.5 text-[13px]" style={{ color: "var(--color-ink-subtle)" }}>
              Sin empresas todavía
            </li>
          ) : (
            companies.map((c) => {
              const active = c.slug === activeSlug;
              return (
                <li key={c.id}>
                  <Link
                    href={`/app/c/${c.slug}`}
                    className="flex items-center justify-between px-2 py-1.5 rounded-[6px] text-[13px]"
                    style={{
                      background: active ? "color-mix(in oklab, var(--color-primary) 8%, transparent)" : "transparent",
                      color: active ? "var(--color-primary)" : "var(--color-ink-muted)",
                      fontWeight: active ? 500 : 400,
                    }}
                  >
                    <span className="truncate">{c.name}</span>
                  </Link>
                </li>
              );
            })
          )}
          <li className="mt-1">
            <Link
              href="/app/companies/new"
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-[6px] text-[13px]"
              style={{ color: "var(--color-ink-subtle)" }}
            >
              <span aria-hidden>+</span>
              <span>Nueva empresa</span>
            </Link>
          </li>
        </ul>
      </nav>

      <div className="mt-auto">
        <div className="hairline-t px-4 py-3">
          <div className="text-[12px] truncate" style={{ color: "var(--color-ink)" }}>
            {user.name ?? user.email}
          </div>
          {user.name ? (
            <div className="text-[11px] truncate" style={{ color: "var(--color-ink-subtle)" }}>
              {user.email}
            </div>
          ) : null}
        </div>
        {children}
      </div>
    </aside>
  );
}
