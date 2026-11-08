"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ProfileFormState, profileUpdateSchema } from "@/lib/types";
import { isAPIError } from "better-auth/api";
import { AUTH_ERROR } from "@/lib/code-errors";

export async function updateProfileAction(
  prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { errors: { form: "Неупълномощен достъп." } };

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const oldPassword = formData.get("oldPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  const sameName = name === session.user.name;
  const sameEmail = email.trim().toLowerCase() === session.user.email.toLowerCase();

  const validatedFields = profileUpdateSchema.safeParse({
    name: sameName ? undefined : name,
    email: sameEmail ? undefined : email,
    oldPassword,
    newPassword,
    confirmPassword,
  });

  if (!validatedFields.success) {
    const errors = z.flattenError(validatedFields.error).fieldErrors as ProfileFormState["errors"];
    return { errors: errors };
  }

  try {
    if (!sameName) {
      await auth.api.updateUser({
        headers: await headers(),
        body: {
          name,
        },
      });
    }

    if (newPassword && oldPassword) {
      await auth.api.changePassword({
        headers: await headers(),
        body: {
          newPassword: newPassword,
          currentPassword: oldPassword,
          revokeOtherSessions: true, // Logs out other devices for security
        },
      });
    }
  } catch (error) {
    if (isAPIError(error)) {
      if (error.message === "Invalid password") {
        return { errors: { oldPassword: ["Грешна стара парола."] } };
      }
      if (error.body?.code === AUTH_ERROR.WEAK_PASSWORD) {
        return { errors: { newPassword: [error.message] } };
      }
    }
    console.log(error);
    return { errors: { form: "Възникна грешка при запазване на профила." } };
  }

  revalidatePath("/", "layout");

  // The new address applies only once the code sent to it is entered. The
  // form asks for that code over HTTP, where better-auth's rate limits apply.
  if (!sameEmail) return { pendingEmail: email.trim().toLowerCase() };
  return { success: true };
}
