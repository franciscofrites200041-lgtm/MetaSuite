"use client";

import { useFormStatus } from "react-dom";
import type { CSSProperties, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

const VARIANT_STYLES: Record<Variant, CSSProperties> = {
  primary: { background: "var(--color-primary)", color: "var(--color-on-primary)" },
  secondary: {
    background: "var(--color-surface-2)",
    color: "var(--color-ink)",
    border: "1px solid var(--color-hairline-strong)",
  },
  ghost: { background: "transparent", color: "var(--color-ink-muted)" },
};

export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  className = "",
  size = "md",
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: Variant;
  className?: string;
  size?: "sm" | "md";
}) {
  const { pending } = useFormStatus();
  const sizeCls = size === "sm" ? "px-3 py-1.5 text-[12px]" : "px-4 py-2.5 text-[13px]";
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`rounded-md font-medium inline-flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${sizeCls} ${className}`}
      style={VARIANT_STYLES[variant]}
    >
      {pending ? <Spinner /> : null}
      <span>{pending && pendingLabel ? pendingLabel : children}</span>
    </button>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-3 w-3 rounded-full border-2 border-t-transparent animate-spin"
      style={{ borderColor: "currentColor", borderTopColor: "transparent" }}
    />
  );
}
