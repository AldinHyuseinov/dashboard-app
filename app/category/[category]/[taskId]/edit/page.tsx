import TaskForm from "@/components/task/TaskForm";
import { getActor } from "@/lib/session";
import { tasks } from "@/lib/tasks";
import { notFound, redirect } from "next/navigation";

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ category: string; taskId: string }>;
}) {
  const { category, taskId } = await params;

  const actor = await getActor();
  if (!actor) {
    redirect("/login?not-authorized=true");
  }

  const task = await tasks.get(actor, taskId);

  if (!task) return notFound();

  return <TaskForm category={category} existingTask={task} />;
}
