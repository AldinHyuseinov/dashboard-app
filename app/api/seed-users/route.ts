import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(request: Request) {
  // 1. Extract and verify the secret from the URL
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (!secret || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
  }

  // 2. Safely parse users from the Environment Variable
  let usersToSeed = [];
  try {
    const rawUsers = process.env.PREDETERMINED_USERS;
    if (!rawUsers) {
      throw new Error("PREDETERMINED_USERS environment variable is missing.");
    }
    usersToSeed = JSON.parse(rawUsers);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Configuration Error",
        details: error instanceof Error ? error.message : "Invalid JSON format",
      },
      { status: 500 },
    );
  }

  const results = [];

  // 3. Iterate and attempt signups via Better-Auth
  for (const user of usersToSeed) {
    try {
      // Basic validation of the JSON object
      if (!user.email || !user.password || !user.name) {
        throw new Error(`Missing required fields for: ${user.email || "Unknown"}`);
      }

      await auth.api.signUpEmail({
        body: {
          email: user.email,
          password: user.password,
          name: user.name,
        },
      });

      results.push({
        email: user.email,
        status: "Success",
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      const isAlreadyExists =
        error.message?.toLowerCase().includes("already exists") ||
        error.code === "USER_ALREADY_EXISTS";

      results.push({
        email: user.email,
        status: isAlreadyExists ? "Skipped" : "Failed",
        reason: error.message || "Unknown error",
      });
    }

    await auth.api.signOut({
      headers: await headers(),
    });
  }

  return NextResponse.json({
    message: "Seeding process completed",
    summary: {
      total: usersToSeed.length,
      success: results.filter((r) => r.status === "Success").length,
      skipped: results.filter((r) => r.status === "Skipped").length,
      failed: results.filter((r) => r.status === "Failed").length,
    },
    results,
  });
}
