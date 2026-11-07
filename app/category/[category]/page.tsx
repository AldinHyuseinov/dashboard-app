import { notFound, redirect } from "next/navigation";
import TaskBoard from "@/components/task/TaskBoard";
import { getCategoryLabel } from "@/lib/categories";
import { Metadata } from "next";
import { getActor } from "@/lib/session";
import { tasks } from "@/lib/tasks";

export const metadata: Metadata = {
  title: "Avexim Communication | Задачи",
};

export default async function Tasks(props: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  const { category } = params;

  const categoryLabel = getCategoryLabel(category);
  if (categoryLabel === undefined) {
    notFound();
  }

  const actor = await getActor();
  if (!actor) {
    redirect("/login?not-authorized=true");
  }

  const board = await tasks.list(actor, { category, page: Number(searchParams.page) });

  return (
    <div className="max-w-6xl mx-auto mt-2 px-2 flex flex-col">
      <div className="flex justify-center items-center mb-2 border-b border-primary-gold p-1">
        <h1 className="text-3xl font-bold text-tertiary-brown text-center">{categoryLabel}</h1>
      </div>

      <TaskBoard
        initialTasks={board.tasks}
        category={category}
        currentUserId={actor.id}
        currentPage={board.currentPage}
        totalPages={board.totalPages}
      />
    </div>
  );
}
