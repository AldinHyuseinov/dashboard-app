import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { files } from "@/lib/files";
import { profilePictures } from "@/lib/profile-pictures";
import type { Actor } from "@/lib/actor";

/** Creates a staff member. The email is derived from the name unless given. */
export async function createUser(name: string, email = `${name.toLowerCase()}@avexim.test`) {
  return prisma.user.create({
    data: { id: randomUUID(), name, email, emailVerified: true },
  });
}

/**
 * A document `uploader` uploaded through the Files module, not yet attached
 * to a Task. Documents are stored as they are, without processing.
 */
export async function uploadFile(
  uploader: Actor,
  {
    fileName = "договор.pdf",
    contents = `contents of ${fileName}` as string | Uint8Array<ArrayBuffer>,
    now = new Date("2026-11-02T08:00:00Z"),
  } = {},
) {
  const result = await files.upload(uploader, {
    file: new File([contents], fileName, { type: "application/pdf" }),
    now,
  });
  if (!result.ok) throw new Error(`Could not upload a file: ${result.error}`);
  return result.file;
}

/** Gives `user` a Profile picture set at `now`, through the Profile pictures module. Returns its address. */
export async function givePicture(user: Actor, now = new Date("2026-11-02T08:00:00Z")) {
  const photo = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#c9a227" } })
    .png()
    .toBuffer();
  const result = await profilePictures.set(user, {
    file: new File([new Uint8Array(photo)], "аз.png", { type: "image/png" }),
    now,
  });
  if (!result.ok) throw new Error(`Could not set a Profile picture: ${result.error}`);
  return result.image;
}

/** Everything a successful `files.read` streams, as one Buffer. */
export async function bytesOf(read: { body: ReadableStream<Uint8Array> }) {
  return Buffer.from(await new Response(read.body).arrayBuffer());
}

/** A session `user` is signed in with, as if on a new device. */
export async function createSession(user: { id: string }, now = new Date("2026-11-02T08:00:00Z")) {
  return prisma.session.create({
    data: {
      id: randomUUID(),
      token: randomUUID(),
      userId: user.id,
      expiresAt: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
      createdAt: now,
      updatedAt: now,
    },
  });
}
