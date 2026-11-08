import { getImageProps } from "next/image";
import Logo from "./Logo";

const BANNER_WIDTH = 1282;
const BANNER_HEIGHT = 299;

/** A blank 1×1 GIF, so phones (where the banner's source doesn't apply) download nothing. */
const BLANK_GIF ="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/**
 * The gold brand panel for screens outside the shell (sign-in, forgot
 * password, not found): a band across the top on phones, a column beside the
 * content on desktop. On desktop the vineyard banner runs across the column
 * between the logo and the tagline. The column is at most 560px wide, so the
 * 1282px banner is only ever shown smaller than its real size, never enlarged.
 */
export default function BrandPanel() {
  const {
    props: { srcSet: bannerSrcSet, sizes },
  } = getImageProps({
    src: "/banner.jpg",
    alt: "",
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    // The column's width on desktop: lg:w-[40%] lg:max-w-70 below.
    sizes: "min(40vw, 560px)",
  });

  return (
    <div className="on-bar safe-top flex shrink-0 flex-col bg-bar text-bar-ink lg:sticky lg:top-0 lg:h-dvh lg:w-[40%] lg:max-w-70">
      <div className="safe-x flex flex-col gap-1 py-3 lg:flex-1 lg:justify-between lg:p-8">
        <Logo height={32} eager />
        <picture className="hidden lg:-mx-8 lg:block">
          {/* 64rem is Tailwind's lg, so the source applies exactly when the picture shows. */}
          <source media="(min-width: 64rem)" srcSet={bannerSrcSet} sizes={sizes} />
          <img
            src={BLANK_GIF}
            alt=""
            width={BANNER_WIDTH}
            height={BANNER_HEIGHT}
            decoding="async"
            className="block h-auto w-full"
          />
        </picture>
        <p className="eyebrow">Комуникационна платформа</p>
      </div>
    </div>
  );
}
