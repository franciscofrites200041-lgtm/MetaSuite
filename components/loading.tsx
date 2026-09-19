export function LoadingBlock({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="min-h-[50vh] grid place-items-center px-6" style={{ background: "var(--color-canvas)" }}>
      <div className="flex items-center gap-3 text-[13px]" style={{ color: "var(--color-ink-subtle)" }}>
        <span
          aria-hidden
          className="inline-block h-3.5 w-3.5 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "var(--color-ink-tertiary)", borderTopColor: "transparent" }}
        />
        <span>{label}</span>
      </div>
    </div>
  );
}
