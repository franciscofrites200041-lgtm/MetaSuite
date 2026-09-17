export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen grid place-items-center px-6" style={{ background: "var(--color-canvas)" }}>
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-5 w-5 rounded"
            style={{ background: "var(--color-primary)" }}
          />
          <span className="font-medium tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Toruk AUGUR
          </span>
        </div>
        {children}
      </div>
    </main>
  );
}
