import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { files } from "@/lib/files";
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
  { fileName = "договор.pdf", now = new Date("2026-11-02T08:00:00Z") } = {},
) {
  const result = await files.upload(uploader, {
    file: new File([`contents of ${fileName}`], fileName, { type: "application/pdf" }),
    now,
  });
  if (!result.ok) throw new Error(`Could not upload a file: ${result.error}`);
  return result.file;
}
