import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import TaskForm from "@/components/task/TaskForm";
import { getActor } from "@/lib/session";
import { tasks } from "@/lib/tasks";
import { taskHref } from "@/lib/navigation";

export const metadata: Metadata = {
  title: "Avexim Communication | Редактиране на задача",
};

/** Edit task: its title, description and files. Only the Task Owner may. */
export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ category: string; taskId: string }>;
}) {
  const { taskId } = await params;

  const actor = await getActor();
  if (!actor) {
    redirect("/login?not-authorized=true");
  }

  const task = await tasks.get(actor, taskId);
  if (!task) return notFound();
  if (task.userId !== actor.id) {
    redirect(taskHref(task));
  }

  return (
    <div className="flex w-full max-w-[640px] flex-col px-2 pt-3 pb-4 lg:px-6 lg:pt-1">
      <TaskForm
        mode="edit"
        task={{
          id: task.id,
          title: task.title,
          description: task.description,
          category: task.category,
          files: task.files,
        }}
      />
    </div>
  );
}
