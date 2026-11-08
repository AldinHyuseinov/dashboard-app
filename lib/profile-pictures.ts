import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import type { Actor } from "@/lib/actor";
import { NO_PICTURE, pictureProblem, UNSUPPORTED_PICTURE } from "@/lib/profile-picture-rules";

/** What the Profile sends: a browser `File`, or anything shaped like one. */
type UploadedPicture = Pick<File, "name" | "type" | "size" | "arrayBuffer">;

export type SetResult = { ok: true; image: string } | { ok: false; error: string };

export type ReadResult =
  | { ok: true; picture: Buffer }
  | { ok: false; reason: "unauthenticated" | "not-found" };

/** Each side of a stored Profile picture, in pixels. */
const SIDE = 256;

/** The formats sharp must find in the bytes: those of IMAGE_TYPES in lib/constants. */
const FORMATS = new Set(["jpeg", "png", "webp", "gif"]);

/** The address of `userId`'s Profile picture set at `setAt`: a new picture gets a new address. */
const addressOf = (userId: string, setAt: Date) =>
  `/api/profile-pictures/${encodeURIComponent(userId)}?v=${setAt.getTime()}`;

/**
 * The centred square of a JPEG, PNG, WebP or GIF photo, 256×256, as WebP,
 * turned upright as the camera recorded it. Only an animated GIF's first
 * frame is kept. Null when the bytes aren't one of those formats.
 */
async function square(bytes: Buffer): Promise<Uint8Array<ArrayBuffer> | null> {
  try {
    // One page: only the first frame of an animation.
    const image = sharp(bytes, { pages: 1 });
    const { format } = await image.metadata();
    if (!FORMATS.has(format)) return null;
    const webp = await image
      .rotate()
      .resize(SIDE, SIDE, { fit: "cover", position: "centre" })
      .webp({ quality: 80 })
      .toBuffer();
    return new Uint8Array(webp);
  } catch {
    return null;
  }
}

/**
 * Sets the Actor's own Profile picture, replacing any they had: the centred
 * square of the photo, 256×256, as WebP. The user record's `image` takes
 * the new picture's address. Refuses anything but a JPEG, PNG, WebP or GIF
 * photo of at most 10MB, keeping the picture there was.
 */
async function set(
  actor: Actor,
  { file, now }: { file: UploadedPicture | null; now: Date },
): Promise<SetResult> {
  if (!file) return { ok: false, error: NO_PICTURE };
  const problem = pictureProblem(file);
  if (problem) return { ok: false, error: problem };

  const data = await square(Buffer.from(await file.arrayBuffer()));
  if (!data) return { ok: false, error: UNSUPPORTED_PICTURE };

  const image = addressOf(actor.id, now);
  await prisma.$transaction([
    prisma.profilePicture.upsert({
      where: { userId: actor.id },
      create: { userId: actor.id, data, setAt: now },
      update: { data, setAt: now },
    }),
    prisma.user.update({ where: { id: actor.id }, data: { image, updatedAt: now } }),
  ]);
  return { ok: true, image };
}

/** Removes the Actor's own Profile picture, if they have one, and its address. */
async function remove(actor: Actor, { now }: { now: Date }): Promise<void> {
  await prisma.$transaction([
    prisma.profilePicture.deleteMany({ where: { userId: actor.id } }),
    prisma.user.update({ where: { id: actor.id }, data: { image: null, updatedAt: now } }),
  ]);
}

/** Any user's Profile picture, as WebP bytes. Only signed-in users may see it. */
async function read(actor: Actor | null, userId: string): Promise<ReadResult> {
  if (!actor) return { ok: false, reason: "unauthenticated" };
  const picture = await prisma.profilePicture.findUnique({
    where: { userId },
    select: { data: true },
  });
  if (!picture) return { ok: false, reason: "not-found" };
  return { ok: true, picture: Buffer.from(picture.data) };
}

/**
 * Profile pictures. An Actor can set and remove only their own: there is
 * no way to name another user. Any signed-in Actor can read anyone's.
 */
export const profilePictures = { set, remove, read };
