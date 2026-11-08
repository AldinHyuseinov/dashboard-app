import { initials } from "@/lib/utils";

const SIZES = {
  /** Replies and small detail rows. */
  sm: "size-[28px] text-[11px]",
  /** Comments: 32px on phones, 36px on desktop. */
  md: "size-4 text-label lg:size-[36px]",
  /** The comment box, desktop only. */
  composer: "hidden size-[36px] text-label lg:flex",
  /** The Profile's heading. */
  lg: "size-7 text-body",
} as const;

/** A person's initials in a tinted circle. Decorative: their name is always written beside it. */
export default function Avatar({ name, size }: { name: string; size: keyof typeof SIZES }) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-tint font-semibold text-gold-ink ${SIZES[size]}`}
    >
      {initials(name)}
    </span>
  );
}
