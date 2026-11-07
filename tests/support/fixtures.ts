import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

/** Creates a staff member. The email is derived from the name unless given. */
export async function createUser(name: string, email = `${name.toLowerCase()}@avexim.test`) {
  return prisma.user.create({
    data: { id: randomUUID(), name, email, emailVerified: true },
  });
}
