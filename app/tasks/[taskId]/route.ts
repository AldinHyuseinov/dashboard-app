import { redirect } from "next/navigation";
import { getActor } from "@/lib/session";
import { tasks } from "@/lib/tasks";
import { taskHref } from "@/lib/navigation";

/**
 * Opens a Task known only by its id, as tapping a push notification does:
 * its screen, or the Feed once it has been deleted.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const actor = await getActor();
  if (!actor) redirect("/login?not-authorized=true");

  const { taskId } = await params;
  const task = await tasks.get(actor, taskId);
  redirect(task ? taskHref(task) : "/");
}
