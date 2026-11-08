/**
 * Makes the app's icons from the logo: the gold heart from the left of
 * public/company-logo.png, on the brand brown. Run it again after the logo
 * changes, and commit what it writes to public/icons/:
 *
 *   node scripts/make-icons.mjs
 *
 * - icon-192.png, icon-512.png: the home screen and install icons
 * - maskable-512.png: the same with room around the heart, for Android's
 *   round and rounded-square masks
 * - apple-touch-icon.png: the iPhone home screen icon (opaque; iOS rounds it)
 * - badge-96.png: the heart in white on transparent, for Android's status
 *   bar, which shows only the shape
 */

import { mkdir } from "node:fs/promises";
import sharp from "sharp";

/** The brand brown (`--color-on-gold` in app/globals.css). */
const BROWN = "#2b2216";

/** Where the heart sits in the logo, with transparent space that `trim` removes. */
const HEART_AREA = { left: 0, top: 0, width: 140, height: 157 };

const OUT = "public/icons";

const area = await sharp("public/company-logo.png").extract(HEART_AREA).png().toBuffer();
const heart = await sharp(area).trim().png().toBuffer();

/** The heart, fitting a `size` square. */
function heartAt(size) {
  return sharp(heart).resize({ width: size, height: size, fit: "inside", kernel: "lanczos3" });
}

/** A `size` square of brown with the heart, `share` of its height, in the middle. */
async function onBrown(size, share) {
  const mark = await heartAt(Math.round(size * share)).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 3, background: BROWN } }).composite([
    { input: mark, gravity: "centre" },
  ]);
}

await mkdir(OUT, { recursive: true });

await (await onBrown(192, 0.6)).png().toFile(`${OUT}/icon-192.png`);
await (await onBrown(512, 0.6)).png().toFile(`${OUT}/icon-512.png`);
// The safe zone of a maskable icon is the middle circle, 80% across.
await (await onBrown(512, 0.5)).png().toFile(`${OUT}/maskable-512.png`);
await (await onBrown(180, 0.6)).removeAlpha().png().toFile(`${OUT}/apple-touch-icon.png`);

const white = await heartAt(72).ensureAlpha().linear([0, 0, 0, 1], [255, 255, 255, 0]).png().toBuffer();
await sharp({ create: { width: 96, height: 96, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: white, gravity: "centre" }])
  .png()
  .toFile(`${OUT}/badge-96.png`);

console.log(`Icons written to ${OUT}/`);
