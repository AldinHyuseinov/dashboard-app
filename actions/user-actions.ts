"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ProfileFormState, profileUpdateSchema } from "@/lib/types";

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

  const validatedFields = profileUpdateSchema.safeParse({
    name,
    email,
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
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name, email },
    });

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    // Better Auth throws a specific error if the old password doesn't match
    if (error?.message?.toLowerCase().includes("password") || error?.status === 400) {
      return { errors: { oldPassword: ["Грешна стара парола."] } };
    }
    return { errors: { form: "Възникна грешка при запазване на профила." } };
  }
  revalidatePath("/");

  return { success: true };
}
