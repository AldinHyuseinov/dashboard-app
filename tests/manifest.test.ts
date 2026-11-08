import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

/** A file the browser fetches from `/…`, where it lies in `public/`. */
function publicFile(src: string) {
  return path.join(process.cwd(), "public", src);
}

/**
 * The web app manifest: what a phone needs to install AVEXIM and open it
 * like an app.
 */
describe("The web app manifest", () => {
  const app = manifest();

  it("names the app AVEXIM and opens it on the Feed, without browser chrome", () => {
    expect(app.name).toBe("AVEXIM");
    expect(app.short_name).toBe("AVEXIM");
    expect(app.start_url).toBe("/");
    expect(app.scope).toBe("/");
    expect(app.display).toBe("standalone");
    expect(app.lang).toBe("bg");
  });

  it("takes the brand gold as its theme colour", () => {
    expect(app.theme_color?.toLowerCase()).toBe("#cda349");
  });

  it("has the icons Android needs, for any shape and for masking", () => {
    const sizes = (purpose: string) =>
      (app.icons ?? []).filter((icon) => (icon.purpose ?? "any") === purpose).map((icon) => icon.sizes);
    expect(sizes("any")).toEqual(expect.arrayContaining(["192x192", "512x512"]));
    expect(sizes("maskable")).toEqual(expect.arrayContaining(["512x512"]));
  });

  it("has every icon it names, at the size it says", async () => {
    for (const icon of app.icons ?? []) {
      const file = publicFile(icon.src);
      expect(existsSync(file), icon.src).toBe(true);
      const { width, height, format } = await sharp(file).metadata();
      expect(`${width}x${height}`, icon.src).toBe(icon.sizes);
      expect(`image/${format}`, icon.src).toBe(icon.type);
    }
  });

  it("has the iPhone home screen icon, square and opaque", async () => {
    const { width, height, hasAlpha } = await sharp(publicFile("/icons/apple-touch-icon.png")).metadata();
    expect([width, height]).toEqual([180, 180]);
    expect(hasAlpha).toBe(false);
  });
});
