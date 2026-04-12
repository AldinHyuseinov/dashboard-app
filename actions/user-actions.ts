"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ProfileFormState, profileUpdateSchema } from "@/lib/types";
import { isAPIError } from "better-auth/api";
import { redirect } from "next/navigation";

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
  const sameEmail = email === session.user.email;

  const validatedFields = profileUpdateSchema.safeParse({
    name: sameName ? undefined : name,
    email: sameEmail ? undefined : email,
    oldPassword,
    newPassword,
    confirmPassword,
  });

  if (!validatedFields.success) {
    const errors = z.flattenError(validatedFields.error).fieldErrors as ProfileFormState["errors"];
    console.log("Profile validation errors:", errors);

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

    if (!sameEmail) {
      await auth.api.changeEmail({
        headers: await headers(),
        body: {
          newEmail: email,
          callbackURL: "/?verified=true",
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
    }
    console.log(error);
    return { errors: { form: "Възникна грешка при запазване на профила." } };
  }

  if (!sameEmail) {
    redirect("/?verify-email=true");
  } else {
    revalidatePath("/");
  }

  return { success: true };
}
