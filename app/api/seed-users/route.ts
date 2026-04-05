import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const PREDETERMINED_USERS = [
  {
    name: "admin",
    email: "admin@email.com",
    password: process.env.USER_SEED_PASSWORD,
  },
  {
    name: "test",
    email: "test@email.com",
    password: process.env.USER_SEED_PASSWORD_2,
  },
];

export async function GET(request: Request) {
  // Example: /api/seed-users?secret=my_super_secret_key
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
  }

  const results = [];

  for (const user of PREDETERMINED_USERS) {
    try {
      if (!user.password) {
        throw new Error("User password is not defined");
      }

      await auth.api.signUpEmail({
        body: {
          email: user.email,
          password: user.password,
          name: user.name,
        },
      });

      results.push({ email: user.email, status: "Success" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      results.push({
        email: user.email,
        status: "Failed",
        reason: errorMessage,
      });
    }
  }

  return NextResponse.json({
    message: "Seeding complete",
    results,
  });
}
