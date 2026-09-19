// Wordmark for Toruk AUGUR. No square, no icon — typographic identity only.
// Each character has TWO layered spans:
//   - outer .wordmark-char: handles the continuous ambient wave (subtle
//     vertical undulation + color pulse cycling ink → primary → ink,
//     both staggered per-index so a wave visibly rolls through the word).
//   - inner .wordmark-char-inner: handles the one-shot entry animation
//     (letters tumble in from below with rotateX, scale and blur clearing).
// Keeping transform-targeting animations on different elements avoids the
// composite-animation conflict where the wave would erase the entry motion.
//
// All animation is pure CSS keyframes (see globals.css). This can stay a
// server component and works inside server layouts.

type WordmarkSize = "sm" | "md" | "lg" | "xl" | "xxl" | "hero";

// Sizes progress from sidebar (sm) up to auth hero (hero). "hero" uses
// clamp() so it fills the editorial column on desktop and shrinks
// gracefully on mobile.
const SIZE_CLASS: Record<WordmarkSize, string> = {
  sm: "text-[15px]",
  md: "text-[20px]",
  lg: "text-[38px] leading-[1]",
  xl: "text-[56px] leading-[0.95]",
  xxl: "text-[88px] leading-[0.9]",
  hero: "wordmark-hero",
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
          <span className="wordmark-char-inner">{ch === " " ? " " : ch}</span>
        </span>
      ))}
    </span>
  );
}
