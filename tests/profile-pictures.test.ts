import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { profilePictures } from "@/lib/profile-pictures";
import { pictureResponse } from "@/lib/file-response";
import { prisma } from "@/lib/prisma";
import type { Actor } from "@/lib/actor";
import { createUser } from "./support/fixtures";

const MONDAY_9AM = new Date("2026-11-02T09:00:00Z");
const MONDAY_10AM = new Date("2026-11-02T10:00:00Z");

/**
 * A photo `width` × `height`, split along its longer side: gold in the first
 * half (left, or top), black in the second. Only a centred square holds both.
 */
async function photo(width: number, height: number) {
  const wide = width >= height;
  const black = await sharp({
    create: {
      width: wide ? width / 2 : width,
      height: wide ? height : height / 2,
      channels: 3,
      background: "#000000",
    },
  })
    .png()
    .toBuffer();
  return sharp({ create: { width, height, channels: 3, background: "#c9a227" } })
    .composite([{ input: black, left: wide ? width / 2 : 0, top: wide ? 0 : height / 2 }])
    .png()
    .toBuffer();
}

/** How red the stored picture is at (`x`, `y`): high on gold, near 0 on black. */
async function redAt(picture: Buffer, x: number, y: number) {
  const { data } = await sharp(picture).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return data[(y * 256 + x) * 3];
}

const asFile = (bytes: Buffer, name: string, type: string) =>
  new File([new Uint8Array(bytes)], name, { type });

/** The address of `user`'s picture set at `when`. */
const addressAt = (user: { id: string }, when: Date) => `/api/profile-pictures/${user.id}?v=${when.getTime()}`;

/** The address on `user`'s record. */
const imageOf = async (user: { id: string }) =>
  (await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { image: true } })).image;

/** The stored picture, as `reader` sees it. */
async function pictureOf(reader: Actor, user: { id: string }) {
  const read = await profilePictures.read(reader, user.id);
  if (!read.ok) throw new Error(read.reason);
  return read.picture;
}

describe("Profile pictures", () => {
  describe("setting", () => {
    it("crops a wide photo to its centred square, 256×256 WebP, and any signed-in user sees it", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");

      const result = await profilePictures.set(ivan, {
        file: asFile(await photo(1200, 600), "аз.png", "image/png"),
        now: MONDAY_9AM,
      });

      expect(result).toEqual({ ok: true, image: addressAt(ivan, MONDAY_9AM) });
      expect(await imageOf(ivan)).toBe(addressAt(ivan, MONDAY_9AM));

      const picture = await pictureOf(maria, ivan);
      expect(await sharp(picture).metadata()).toMatchObject({ format: "webp", width: 256, height: 256 });
      expect(await redAt(picture, 20, 128)).toBeGreaterThan(150);
      expect(await redAt(picture, 236, 128)).toBeLessThan(40);
    });

    it("crops a tall photo to its centred square", async () => {
      const ivan = await createUser("Ivan");

      await profilePictures.set(ivan, {
        file: asFile(await photo(600, 1200), "аз.png", "image/png"),
        now: MONDAY_9AM,
      });

      const picture = await pictureOf(ivan, ivan);
      expect(await sharp(picture).metadata()).toMatchObject({ format: "webp", width: 256, height: 256 });
      expect(await redAt(picture, 128, 20)).toBeGreaterThan(150);
      expect(await redAt(picture, 128, 236)).toBeLessThan(40);
    });

    it("turns a phone photo upright, as the camera recorded it", async () => {
      const ivan = await createUser("Ivan");
      // Stored wide (gold left, black right), to be shown turned a quarter clockwise: gold on top.
      const sideways = await sharp(await photo(1200, 600))
        .jpeg()
        .withMetadata({ orientation: 6 })
        .toBuffer();

      await profilePictures.set(ivan, { file: asFile(sideways, "IMG_0001.jpg", "image/jpeg"), now: MONDAY_9AM });

      const picture = await pictureOf(ivan, ivan);
      expect(await redAt(picture, 128, 20)).toBeGreaterThan(150);
      expect(await redAt(picture, 128, 236)).toBeLessThan(40);
    });

    it("keeps only the first frame of an animated GIF", async () => {
      const ivan = await createUser("Ivan");
      const frame = (background: string) =>
        sharp({ create: { width: 300, height: 300, channels: 3, background } }).png().toBuffer();
      const gif = await sharp([await frame("#c9a227"), await frame("#000000")], {
        join: { animated: true },
      })
        .gif({ delay: [500, 500] })
        .toBuffer();
      expect((await sharp(gif).metadata()).pages).toBe(2);

      await profilePictures.set(ivan, { file: asFile(gif, "аз.gif", "image/gif"), now: MONDAY_9AM });

      const picture = await pictureOf(ivan, ivan);
      const stored = await sharp(picture).metadata();
      expect(stored).toMatchObject({ format: "webp", width: 256, height: 256 });
      expect(stored.pages ?? 1).toBe(1);
      expect(await redAt(picture, 128, 128)).toBeGreaterThan(150);
    });
  });

  describe("replacing and removing", () => {
    it("a new picture replaces the old one under a new address", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const first = await profilePictures.set(ivan, {
        file: asFile(await photo(400, 400), "първа.png", "image/png"),
        now: MONDAY_9AM,
      });
      const old = await pictureOf(maria, ivan);

      // All black this time.
      const black = await sharp({ create: { width: 400, height: 400, channels: 3, background: "#000000" } })
        .jpeg()
        .toBuffer();
      const second = await profilePictures.set(ivan, {
        file: asFile(black, "втора.jpg", "image/jpeg"),
        now: MONDAY_10AM,
      });

      expect(second).toEqual({ ok: true, image: addressAt(ivan, MONDAY_10AM) });
      expect(second).not.toEqual(first);
      expect(await imageOf(ivan)).toBe(addressAt(ivan, MONDAY_10AM));
      const current = await pictureOf(maria, ivan);
      expect(current.equals(old)).toBe(false);
      expect(await redAt(current, 20, 128)).toBeLessThan(40);
    });

    it("removing leaves no picture and no address", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      await profilePictures.set(ivan, { file: asFile(await photo(400, 400), "аз.png", "image/png"), now: MONDAY_9AM });

      await profilePictures.remove(ivan, { now: MONDAY_10AM });

      expect(await imageOf(ivan)).toBeNull();
      expect(await profilePictures.read(maria, ivan.id)).toEqual({ ok: false, reason: "not-found" });
    });

    it("removing when there's no picture leaves none", async () => {
      const ivan = await createUser("Ivan");

      await profilePictures.remove(ivan, { now: MONDAY_10AM });

      expect(await imageOf(ivan)).toBeNull();
    });

    it("Maria removing her picture leaves Ivan's", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      await profilePictures.set(ivan, { file: asFile(await photo(400, 400), "аз.png", "image/png"), now: MONDAY_9AM });
      await profilePictures.set(maria, { file: asFile(await photo(400, 400), "аз.png", "image/png"), now: MONDAY_9AM });

      await profilePictures.remove(maria, { now: MONDAY_10AM });

      expect(await imageOf(ivan)).toBe(addressAt(ivan, MONDAY_9AM));
      expect(await profilePictures.read(maria, ivan.id)).toMatchObject({ ok: true });
    });

    it("goes when its user is deleted", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      await profilePictures.set(ivan, { file: asFile(await photo(400, 400), "аз.png", "image/png"), now: MONDAY_9AM });

      await prisma.user.delete({ where: { id: ivan.id } });

      expect(await profilePictures.read(maria, ivan.id)).toEqual({ ok: false, reason: "not-found" });
    });
  });

  describe("reading", () => {
    it("is refused without a session", async () => {
      const ivan = await createUser("Ivan");
      await profilePictures.set(ivan, { file: asFile(await photo(400, 400), "аз.png", "image/png"), now: MONDAY_9AM });

      expect(await profilePictures.read(null, ivan.id)).toEqual({ ok: false, reason: "unauthenticated" });
    });

    it("reports a user without a picture", async () => {
      const ivan = await createUser("Ivan");

      expect(await profilePictures.read(ivan, ivan.id)).toEqual({ ok: false, reason: "not-found" });
      expect(await profilePictures.read(ivan, "missing-user")).toEqual({ ok: false, reason: "not-found" });
    });
  });

  describe("serving", () => {
    it("sends the picture as WebP, cached privately for a long time since its address is versioned", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      await profilePictures.set(ivan, { file: asFile(await photo(400, 400), "аз.png", "image/png"), now: MONDAY_9AM });

      const response = pictureResponse(await profilePictures.read(maria, ivan.id));

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("image/webp");
      expect(response.headers.get("Cache-Control")).toBe("private, max-age=31536000, immutable");
      const body = Buffer.from(await response.arrayBuffer());
      expect(body.equals(await pictureOf(maria, ivan))).toBe(true);
      expect(response.headers.get("Content-Length")).toBe(String(body.length));
    });

    it("refuses anyone who isn't signed in", async () => {
      const ivan = await createUser("Ivan");
      await profilePictures.set(ivan, { file: asFile(await photo(400, 400), "аз.png", "image/png"), now: MONDAY_9AM });

      const response = pictureResponse(await profilePictures.read(null, ivan.id));

      expect(response.status).toBe(401);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    });

    it("answers 404, uncached, for someone without a picture", async () => {
      const ivan = await createUser("Ivan");

      const response = pictureResponse(await profilePictures.read(ivan, ivan.id));

      expect(response.status).toBe(404);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    });
  });

  describe("refusing", () => {
    const UNSUPPORTED = "Изберете снимка във формат JPEG, PNG, WebP или GIF.";

    it("refuses a type other than JPEG, PNG, WebP or GIF, and keeps the picture there was", async () => {
      const ivan = await createUser("Ivan");
      await profilePictures.set(ivan, { file: asFile(await photo(400, 400), "аз.png", "image/png"), now: MONDAY_9AM });
      const before = await pictureOf(ivan, ivan);

      for (const file of [
        new File(["%PDF-1.7"], "аз.pdf", { type: "application/pdf" }),
        asFile(await sharp(await photo(400, 400)).tiff().toBuffer(), "аз.tiff", "image/tiff"),
        new File(["heic bytes"], "IMG_0001.HEIC", { type: "image/heic" }),
      ]) {
        expect(await profilePictures.set(ivan, { file, now: MONDAY_10AM })).toEqual({
          ok: false,
          error: UNSUPPORTED,
        });
      }

      expect(await imageOf(ivan)).toBe(addressAt(ivan, MONDAY_9AM));
      expect((await pictureOf(ivan, ivan)).equals(before)).toBe(true);
    });

    it("refuses a file that only claims to be an image", async () => {
      const ivan = await createUser("Ivan");
      const tiff = await sharp(await photo(400, 400)).tiff().toBuffer();

      for (const file of [
        new File(["not an image"], "аз.png", { type: "image/png" }),
        asFile(tiff, "аз.jpg", "image/jpeg"),
      ]) {
        expect(await profilePictures.set(ivan, { file, now: MONDAY_9AM })).toEqual({
          ok: false,
          error: UNSUPPORTED,
        });
      }
      expect(await imageOf(ivan)).toBeNull();
    });

    it("refuses a photo over 10MB without reading it", async () => {
      const ivan = await createUser("Ivan");
      const huge = {
        name: "огромна.jpg",
        type: "image/jpeg",
        size: 10 * 1024 * 1024 + 1,
        arrayBuffer: () => Promise.reject(new Error("must not be read")),
      };

      expect(await profilePictures.set(ivan, { file: huge, now: MONDAY_9AM })).toEqual({
        ok: false,
        error: "Снимката е твърде голяма. Максималният размер е 10MB.",
      });
      expect(await imageOf(ivan)).toBeNull();
    });

    it("refuses when no photo was chosen", async () => {
      const ivan = await createUser("Ivan");

      expect(await profilePictures.set(ivan, { file: null, now: MONDAY_9AM })).toEqual({
        ok: false,
        error: "Няма избрана снимка.",
      });
    });
  });
});
