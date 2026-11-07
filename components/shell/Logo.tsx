import Image from "next/image";

const LOGO_WIDTH = 768;
const LOGO_HEIGHT = 157;

/**
 * The AVEXIM logo: white lettering with the gold heart and red grapes, so it
 * always sits on the gold bar (or the dark bar in dark appearance).
 */
export default function Logo({ height, eager }: { height: number; eager?: boolean }) {
  return (
    <Image
      src="/company-logo.png"
      alt="AVEXIM"
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      loading={eager ? "eager" : undefined}
      style={{ height, width: (height * LOGO_WIDTH) / LOGO_HEIGHT }}
      className="block"
    />
  );
}
