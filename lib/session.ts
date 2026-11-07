import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import type { Actor } from "@/lib/actor";

/** The signed-in user as an Actor, or `null` without a session. */
export async function getActor(): Promise<Actor | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  return { id: session.user.id, name: session.user.name };
}

/** The signed-in user as an Actor. Throws without a session. */
export async function requireActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw new Error("Unauthorized");
  return actor;
}
