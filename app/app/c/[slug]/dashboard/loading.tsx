export default function Loading() {
  return (
    <section className="max-w-[1180px] mx-auto px-10 pt-12 pb-24">
      <div className="h-6 w-32 mb-3 rounded-md" style={{ background: "var(--color-hairline)" }} />
      <div className="h-9 w-64 mb-2 rounded-md" style={{ background: "var(--color-hairline)" }} />
      <div className="h-4 w-56 mb-10 rounded-md" style={{ background: "var(--color-hairline)" }} />
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3 mb-10">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="hairline rounded-lg p-4 h-[104px]" style={{ background: "var(--color-surface-1)" }} />
        ))}
      </div>
      <div className="hairline rounded-lg h-[280px]" style={{ background: "var(--color-surface-1)" }} />
    </section>
  );
}
