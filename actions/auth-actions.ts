"use server";

import { auth } from "@/lib/auth";
import { loginSchema, LoginState } from "@/lib/types";
import { isAPIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function loginAction(prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const validatedFields = loginSchema.safeParse({ email, password });

  if (!validatedFields.success) {
    const errors: LoginState["errors"] = {
      email: [],
      password: [],
    };

    validatedFields.error.issues.forEach((issue) => {
      const field = String(issue.path[0]);

      if (field === "email" && errors.email) {
        errors.email.push(issue.message);
      } else if (field === "password" && errors.password) {
        errors.password.push(issue.message);
      }
    });

    return { errors };
  }

  try {
    await auth.api.signInEmail({
      body: {
        email: validatedFields.data.email,
        password: validatedFields.data.password,
      },
      headers: await headers(),
    });
  } catch (error) {
    if (isAPIError(error)) {
      return {
        errors: {
          form: "Несъществуващ потребител или грешна парола.",
        },
      };
    }

    return {
      errors: {
        form: "Възникна грешка. Моля, опитайте отново.",
      },
    };
  }

  redirect("/?success-login=true");
}

export async function signOutAction() {
  await auth.api.signOut({
    headers: await headers(),
  });
}
