import { NextResponse } from "next/server";
import { activity } from "@/lib/activity";
import { getActor } from "@/lib/session";

/** The signed-in user's Unread count, for the navigation (and later the app icon's badge). */
export async function GET() {
  const actor = await getActor();
  if (!actor) return new NextResponse("Unauthorized", { status: 401 });

  return NextResponse.json(
    { count: await activity.unreadCount(actor) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
