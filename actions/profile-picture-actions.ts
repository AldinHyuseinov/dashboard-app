"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getActor } from "@/lib/session";
import { profilePictures } from "@/lib/profile-pictures";

export type PictureResult = { ok: true } | { ok: false; error: string };

const SIGNED_OUT = "Сесията ви е изтекла. Влезте отново и опитайте пак.";
const UNEXPECTED = "Възникна неочаквана грешка. Опитайте отново.";

/** Sets the signed-in person's Profile picture from the photo in `picture`. */
export async function setProfilePictureAction(formData: FormData): Promise<PictureResult> {
  const actor = await getActor();
  if (!actor) return { ok: false, error: SIGNED_OUT };

  const file = formData.get("picture");
  try {
    const result = await profilePictures.set(actor, {
      file: file instanceof File ? file : null,
      now: new Date(),
    });
    if (!result.ok) return result;
  } catch (error) {
    console.error("Setting a Profile picture failed:", error);
    return { ok: false, error: UNEXPECTED };
  }

  await pictureChanged();
  return { ok: true };
}

/** Removes the signed-in person's Profile picture, so their initials show again. */
export async function removeProfilePictureAction(): Promise<PictureResult> {
  const actor = await getActor();
  if (!actor) return { ok: false, error: SIGNED_OUT };

  try {
    await profilePictures.remove(actor, { now: new Date() });
  } catch (error) {
    console.error("Removing a Profile picture failed:", error);
    return { ok: false, error: UNEXPECTED };
  }

  await pictureChanged();
  return { ok: true };
}

/**
 * Makes the next render show the new picture: better-auth keeps the user,
 * `image` included, in a session cookie for a minute, so that cookie is
 * read afresh from the database and rewritten; and every screen is
 * re-rendered, since the shell shows the person on each of them.
 */
async function pictureChanged() {
  await auth.api.getSession({ headers: await headers(), query: { disableCookieCache: true } });
  revalidatePath("/", "layout");
}
