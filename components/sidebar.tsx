"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Wordmark } from "@/components/wordmark";

type Company = { id: string; name: string; slug: string; logo_url?: string | null };

const STORAGE_KEY = "sidebar-hidden-v1";

function initials(nameOrEmail: string): string {
  const parts = nameOrEmail.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return nameOrEmail.slice(0, 2).toUpperCase();
}

export function Sidebar({
  user,
  companies,
}: {
  user: { email: string; name: string | null };
  companies: Company[];
}) {
  const pathname = usePathname();
  const activeSlug = pathname.startsWith("/app/c/") ? pathname.split("/")[3] : null;
  const isSettings = pathname === "/app/settings";
  const isHome = pathname === "/app";
  const displayName = user.name ?? user.email;

  const [hidden, setHidden] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    try {
      setHidden(localStorage.getItem(STORAGE_KEY) === "true");
    } catch {}
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, String(hidden)); } catch {}
  }, [hidden, hydrated]);

  if (hydrated && hidden) {
    return (
      <div
        className="shrink-0 flex flex-col hairline-r"
        style={{ width: 44, background: "var(--color-surface-1)" }}
      >
        <button
          type="button"
          onClick={() => setHidden(false)}
          className="h-11 flex items-center justify-center hover:bg-[color:var(--color-surface-2)]"
          style={{ color: "var(--color-ink-muted)" }}
          title="Mostrar menú"
          aria-label="Mostrar menú"
        >
          ›
        </button>
        <div className="hairline-t" />
        <Link
          href="/app"
          className="h-11 flex items-center justify-center hover:bg-[color:var(--color-surface-2)]"
          title="Inicio"
          aria-label="Inicio"
          style={{ color: isHome ? "var(--color-primary)" : "var(--color-ink-muted)" }}
        >
          ⌂
        </Link>
        <div className="flex-1 overflow-y-auto py-1">
          {companies.map((c) => {
            const active = c.slug === activeSlug;
            return (
              <Link
                key={c.id}
                href={`/app/c/${c.slug}`}
                title={c.name}
                aria-label={c.name}
                className="h-11 flex items-center justify-center hover:bg-[color:var(--color-surface-2)]"
                style={{
                  background: active ? "color-mix(in oklab, var(--color-primary) 8%, transparent)" : undefined,
                }}
              >
                {c.logo_url ? (
                  <Image src={c.logo_url} alt="" width={22} height={22} className="rounded-[3px] object-cover" unoptimized />
                ) : (
                  <span
                    aria-hidden
                    className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-[3px] text-[10px]"
                    style={{
                      background: "var(--color-surface-2)",
                      color: active ? "var(--color-primary)" : "var(--color-ink-muted)",
                      border: "1px solid var(--color-hairline)",
                    }}
                  >
                    {c.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </Link>
            );
          })}
          <Link
            href="/app/companies/new"
            title="Nueva empresa"
            aria-label="Nueva empresa"
            className="h-11 flex items-center justify-center hover:bg-[color:var(--color-surface-2)]"
            style={{ color: "var(--color-ink-subtle)" }}
          >
            +
          </Link>
        </div>
        <Link
          href="/app/settings"
          title={displayName}
          aria-label="Configuración"
          className="mt-auto h-12 flex items-center justify-center hairline-t hover:bg-[color:var(--color-surface-2)]"
        >
          <span
            aria-hidden
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-medium"
            style={{ background: "var(--color-surface-2)", color: "var(--color-ink-muted)", border: "1px solid var(--color-hairline)" }}
          >
            {initials(displayName)}
          </span>
        </Link>
      </div>
    );
  }

  return (
    <aside
      className="w-[248px] shrink-0 flex flex-col hairline-r"
      style={{ background: "var(--color-surface-1)" }}
    >
      <div className="px-4 pt-5 pb-4 flex items-center justify-between gap-2">
        <Link href="/app" className="min-w-0">
          <Wordmark text="Toruk AUGUR" size="sm" />
        </Link>
        <button
          type="button"
          onClick={() => setHidden(true)}
          className="shrink-0 rounded-md w-6 h-6 flex items-center justify-center text-[13px] hairline hover:bg-[color:var(--color-surface-2)]"
          style={{ background: "var(--color-surface-1)", color: "var(--color-ink-subtle)" }}
          title="Ocultar menú"
          aria-label="Ocultar menú"
        >
          ‹
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2">
        <Link
          href="/app"
          className="flex items-center gap-2 px-2 py-1.5 rounded-[6px] text-[13px]"
          style={{
            background: isHome ? "color-mix(in oklab, var(--color-primary) 8%, transparent)" : "transparent",
            color: isHome ? "var(--color-primary)" : "var(--color-ink-muted)",
            fontWeight: isHome ? 500 : 400,
          }}
        >
          Inicio
        </Link>

        <div className="px-2 pt-5 pb-1 text-[10px] tracking-wider uppercase" style={{ color: "var(--color-ink-tertiary)" }}>
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
                    className="flex items-center gap-2 px-2 py-1.5 rounded-[6px] text-[13px]"
                    style={{
                      background: active ? "color-mix(in oklab, var(--color-primary) 8%, transparent)" : "transparent",
                      color: active ? "var(--color-primary)" : "var(--color-ink-muted)",
                      fontWeight: active ? 500 : 400,
                    }}
                  >
                    {c.logo_url ? (
                      <Image
                        src={c.logo_url}
                        alt=""
                        width={18}
                        height={18}
                        className="rounded-[3px] object-cover shrink-0"
                        unoptimized
                      />
                    ) : (
                      <span
                        aria-hidden
                        className="shrink-0 inline-flex h-[18px] w-[18px] items-center justify-center rounded-[3px] text-[9px]"
                        style={{ background: "var(--color-surface-2)", color: "var(--color-ink-subtle)", border: "1px solid var(--color-hairline)" }}
                      >
                        {c.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
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

      <div className="mt-auto hairline-t">
        <Link
          href="/app/settings"
          className="flex items-center gap-3 px-4 py-3 hover:bg-[color:var(--color-surface-2)]"
          style={{
            background: isSettings ? "color-mix(in oklab, var(--color-primary) 8%, transparent)" : "transparent",
          }}
        >
          <span
            aria-hidden
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-medium"
            style={{ background: "var(--color-surface-2)", color: "var(--color-ink-muted)", border: "1px solid var(--color-hairline)" }}
          >
            {initials(displayName)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] truncate" style={{ color: "var(--color-ink)", fontWeight: 500 }}>
              {displayName}
            </div>
            <div className="text-[11px] truncate" style={{ color: "var(--color-ink-subtle)" }}>
              {isSettings ? "Configuración" : "Ver ajustes →"}
            </div>
          </div>
        </Link>
      </div>
    </aside>
  );
}
