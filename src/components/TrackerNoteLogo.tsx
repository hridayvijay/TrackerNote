import { useId } from "react";

type TrackerNoteLogoProps = {
  variant?: "mark" | "wordmark";
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
};

export default function TrackerNoteLogo({
  variant = "wordmark",
  className = "",
  markClassName = "h-9 w-9",
  wordmarkClassName = "text-xl",
}: TrackerNoteLogoProps) {
  const gradientId = `trackernote-mark-${useId().replace(/:/g, "")}`;

  const mark = (
    <svg
      viewBox="0 0 128 128"
      className={variant === "mark" ? className : markClassName}
      aria-hidden={variant === "wordmark"}
      aria-label={variant === "mark" ? "TrackerNote" : undefined}
      role={variant === "mark" ? "img" : undefined}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradientId} x1="25" y1="25" x2="108" y2="110" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--theme-text-primary)" />
          <stop offset="0.48" stopColor="var(--theme-orb-1)" />
          <stop offset="0.76" stopColor="var(--theme-orb-2)" />
          <stop offset="1" stopColor="var(--theme-orb-3)" />
        </linearGradient>
      </defs>

      <rect x="12" y="14" width="94" height="14" rx="7" fill="var(--theme-text-primary)" />
      <path d="M38 25H53V111H38V25Z" fill={`url(#${gradientId})`} />
      <path d="M95 38H110V112H95V38Z" fill={`url(#${gradientId})`} />
      <path d="M49 47L105 94V113L49 66V47Z" fill={`url(#${gradientId})`} />
    </svg>
  );

  if (variant === "mark") return mark;

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} aria-label="TrackerNote">
      {mark}
      <span className={`font-semibold tracking-[-0.035em] leading-none ${wordmarkClassName}`} aria-hidden="true">
        <span className="text-[var(--theme-text-primary)]">Tracker</span>
        <span
          className="text-transparent"
          style={{
            backgroundImage: "linear-gradient(120deg, var(--theme-orb-1), var(--theme-orb-2), var(--theme-orb-3))",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
          }}
        >
          Note
        </span>
      </span>
    </span>
  );
}
