import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import type { Actor } from "@/lib/actor";

/**
 * The signed-in user as an Actor, with the id of the session this browser is
 * signed in with, or `null` without a session.
 */
export async function getActorSession(): Promise<{ actor: Actor; sessionId: string } | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  return {
    actor: { id: session.user.id, name: session.user.name },
    sessionId: session.session.id,
  };
}

/** The signed-in user as an Actor, with their session's id. Throws without a session. */
export async function requireActorSession(): Promise<{ actor: Actor; sessionId: string }> {
  const signedIn = await getActorSession();
  if (!signedIn) throw new Error("Unauthorized");
  return signedIn;
}

/** The signed-in user as an Actor, or `null` without a session. */
export async function getActor(): Promise<Actor | null> {
  return (await getActorSession())?.actor ?? null;
}

/** The signed-in user as an Actor. Throws without a session. */
export async function requireActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw new Error("Unauthorized");
  return actor;
}
