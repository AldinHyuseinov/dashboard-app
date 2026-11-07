import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

/** Creates a staff member. The email is derived from the name unless given. */
export async function createUser(name: string, email = `${name.toLowerCase()}@avexim.test`) {
  return prisma.user.create({
    data: { id: randomUUID(), name, email, emailVerified: true },
  });
}

/** A file uploaded through the upload route but not yet attached to a Task. */
export async function uploadFile(fileName = "снимка.webp") {
  return prisma.taskFile.create({
    data: { fileName, fileType: "image/webp", data: Buffer.from("not really an image") },
    select: { id: true },
  });
}
