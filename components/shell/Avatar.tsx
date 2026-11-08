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

/**
 * A person in a circle: their Profile picture when they have one, their
 * initials on a tint otherwise. Decorative: their name is always written
 * beside it.
 */
export default function Avatar({
  name,
  image,
  size,
}: {
  name: string;
  /** The address of their Profile picture, or nothing without one. */
  image?: string | null;
  size: keyof typeof SIZES;
}) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-tint font-semibold text-gold-ink ${SIZES[size]}`}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- served from the database to signed-in people only
        <img src={image} alt="" className="size-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
