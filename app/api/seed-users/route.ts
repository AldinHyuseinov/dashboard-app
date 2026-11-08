import { createHash, timingSafeEqual } from "node:crypto";
import { auth } from "@/lib/auth";

/** The request header that carries SEED_SECRET. */
const SECRET_HEADER = "x-seed-secret";

/**
 * Whether the request carries the configured seed secret. Refuses everyone
 * when none is configured. Compares digests so the time taken reveals nothing.
 */
function hasSeedSecret(request: Request): boolean {
  const expected = process.env.SEED_SECRET;
  const given = request.headers.get(SECRET_HEADER);
  if (!expected || !given) return false;
  const digest = (text: string) => createHash("sha256").update(text).digest();
  return timingSafeEqual(digest(given), digest(expected));
}

/**
 * Adds the staff accounts listed in PREDETERMINED_USERS, skipping those that
 * already exist. Only POST is exported, so Next.js answers any other method
 * with 405, and the secret travels in a header so it never lands in a URL or
 * a server log.
 *
 *   curl -X POST -H "x-seed-secret: $SEED_SECRET" https://…/api/seed-users
 */
export async function POST(request: Request) {
  if (!hasSeedSecret(request)) {
    return Response.json({ error: "Unauthorized access" }, { status: 401 });
  }

  // Safely parse users from the Environment Variable
  let usersToSeed = [];
  try {
    const rawUsers = process.env.PREDETERMINED_USERS;
    if (!rawUsers) {
      throw new Error("PREDETERMINED_USERS environment variable is missing.");
    }
    usersToSeed = JSON.parse(rawUsers);
  } catch (error) {
    return Response.json(
      {
        error: "Configuration Error",
        details: error instanceof Error ? error.message : "Invalid JSON format",
      },
      { status: 500 },
    );
  }

  const results = [];

  const { internalAdapter } = await auth.$context;

  for (const user of usersToSeed) {
    try {
      if (!user.email || !user.password || !user.name) {
        throw new Error(`Missing required fields for: ${user.email || "Unknown"}`);
      }

      // Checked here: better-auth answers a sign-up for a taken address as if
      // it succeeded, so it can't be told apart from a new account.
      if (await internalAdapter.findUserByEmail(String(user.email).toLowerCase())) {
        results.push({ email: user.email, status: "Skipped", reason: "Already exists" });
        continue;
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
    } catch (error) {
      results.push({
        email: user.email,
        status: "Failed",
        reason: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return Response.json({
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
