import { initials } from "@/lib/utils";

const SIZES = {
  /** The sidebar's profile chip, nudged left to line up with the icons above it. */
  chip: "-ml-0.5 size-3.5 text-[11px]",
  /** Replies and small detail rows. */
  sm: "size-[28px] text-[11px]",
  /** Comments: 32px on phones, 36px on desktop. */
  md: "size-4 text-label lg:size-[36px]",
  /** The comment box, desktop only. */
  composer: "hidden size-[36px] text-label lg:flex",
  /** Feed items. */
  feed: "size-5 text-secondary",
  /** The Profile's heading. */
  lg: "size-7 text-body",
} as const;

/** The circle behind the initials: a gold tint on screens, the sidebar's own colours on it. */
const TONES = {
  tint: "bg-tint font-semibold text-gold-ink",
  sidebar: "bg-side-new font-bold text-on-side-new",
} as const;

/**
 * A person in a circle: their Profile picture when they have one, their
 * initials otherwise. Decorative: their name is always written beside it.
 */
export default function Avatar({
  name,
  image,
  size,
  tone = "tint",
}: {
  name: string;
  /** The address of their Profile picture, or nothing without one. */
  image?: string | null;
  size: keyof typeof SIZES;
  tone?: keyof typeof TONES;
}) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full ${TONES[tone]} ${SIZES[size]}`}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- served from the database to signed-in people only
        <img src={image} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
