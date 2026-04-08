import TaskForm from "@/components/task/TaskForm";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ category: string; taskId: string }>;
}) {
  const { category, taskId } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login?not-authorized=true");
  }

  // Fetch the existing task with its files
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      files: {
        select: { id: true, fileName: true, fileType: true }, // Only metadata
      },
    },
  });

  if (!task) return notFound();

  return <TaskForm category={category} existingTask={task} />;
}
