"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { isAPIError } from "better-auth/api";
import { AUTH_ERROR } from "@/lib/code-errors";
import { checkDetails, checkPasswordChange, type PasswordChange } from "@/lib/profile-form";

export type DetailsState = {
  errors?: { name?: string; email?: string; form?: string };
  /** What was sent, kept in the fields when it's refused or an email change waits. */
  values?: { name: string; email: string };
  /** The new address a code is to be sent to; the change waits for that code. */
  pendingEmail?: string;
  /** Set when the save went through: whether the name changed, and whether anything did. */
  saved?: { name: boolean; anything: boolean };
};

/**
 * The Profile's name and email. A new name applies at once. A new address
 * applies only once the code sent to it is entered: the form asks for that
 * code over HTTP, where better-auth's rate limits apply.
 */
export async function updateDetailsAction(
  _: DetailsState,
  formData: FormData,
): Promise<DetailsState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { errors: { form: "Неупълномощен достъп." } };

  const values = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
  };
  const check = checkDetails(values, session.user);
  if (!check.ok) return { errors: check.errors, values };

  if (check.name) {
    try {
      await auth.api.updateUser({ headers: await headers(), body: { name: check.name } });
    } catch (error) {
      console.log(error);
      return { errors: { form: "Името не беше запазено. Опитайте отново." }, values };
    }
    // The sidebar shows the name on every screen.
    revalidatePath("/", "layout");
  }

  const saved = { name: check.name !== null, anything: check.name !== null || check.email !== null };
  if (check.email) return { pendingEmail: check.email, values, saved };
  return { saved };
}

export type PasswordState = {
  errors?: Partial<PasswordChange> & { form?: string };
  changed?: boolean;
};

/** Changes the password, under the password rules, and signs out every other device. */
export async function changePasswordAction(
  _: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const input = {
    oldPassword: String(formData.get("oldPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  };
  const errors = checkPasswordChange(input);
  if (Object.keys(errors).length > 0) return { errors };

  try {
    await auth.api.changePassword({
      headers: await headers(),
      // The auth configuration signs out the other devices (lib/auth.ts).
      body: { currentPassword: input.oldPassword, newPassword: input.newPassword },
    });
  } catch (error) {
    if (isAPIError(error)) {
      if (error.message === "Invalid password") {
        return { errors: { oldPassword: "Грешна стара парола." } };
      }
      if (error.body?.code === AUTH_ERROR.WEAK_PASSWORD) {
        return { errors: { newPassword: error.message } };
      }
    }
    console.log(error);
    return { errors: { form: "Паролата не беше сменена. Опитайте отново." } };
  }

  return { changed: true };
}
