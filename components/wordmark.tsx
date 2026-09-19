// Wordmark for Toruk AUGUR. Kinetic-type entry animation (staggered fade +
// y-offset + blur), then a subtle color-primary shimmer that sweeps across
// the letters every ~8s once the entry finishes. No square, no icon —
// just typographic identity. Styles live in globals.css.
//
// Deliberately a Server Component: the animation is pure CSS keyframes,
// no state or effects needed. That keeps it usable in server layouts.

type WordmarkSize = "sm" | "md" | "lg" | "xl";

const SIZE_CLASS: Record<WordmarkSize, string> = {
  sm: "text-[15px]",
  md: "text-[20px]",
  lg: "text-[38px] leading-[1]",
  xl: "text-[56px] leading-[0.95]",
};

export function Wordmark({
  text = "Toruk AUGUR",
  size = "sm",
  className = "",
}: {
  text?: string;
  size?: WordmarkSize;
  className?: string;
}) {
  const chars = [...text];
  return (
    <span
      className={`wordmark ${SIZE_CLASS[size]} ${className}`}
      aria-label={text}
      role="img"
    >
      {chars.map((ch, i) => (
        <span
          key={i}
          className="wordmark-char"
          style={{ ["--i" as string]: i }}
          aria-hidden
        >
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  );
}
