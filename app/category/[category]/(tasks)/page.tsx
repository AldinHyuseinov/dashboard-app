import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { Metadata } from "next";
import Alert from "@/components/notification/Alert";
import Pagination from "@/components/Pagination";
import TaskList from "@/components/task/TaskList";
import { PlusIcon } from "@/components/shell/icons";
import { getCategoryGroupLabel, getCategoryLabel } from "@/lib/categories";
import { getActor } from "@/lib/session";
import { tasks } from "@/lib/tasks";

export const metadata: Metadata = {
  title: "Avexim Communication | Задачи",
};

/** A Category's Tasks, most recently updated first, a page at a time. */
export default async function CategoryTasksPage(props: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { category } = await props.params;
  const searchParams = await props.searchParams;

  const categoryLabel = getCategoryLabel(category);
  if (categoryLabel === undefined) {
    notFound();
  }

  const actor = await getActor();
  if (!actor) {
    redirect("/login?not-authorized=true");
  }

  const now = new Date();
  const board = await tasks.list(actor, { category, page: Number(searchParams.page) });
  const createHref = `/category/${category}/create`;

  return (
    <div className="flex w-full max-w-[720px] flex-col gap-3 px-2 pt-3 pb-4 lg:gap-4 lg:px-6 lg:pt-1">
      <Suspense fallback={null}>
        <Alert />
      </Suspense>

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="eyebrow text-ink-2">{getCategoryGroupLabel(category) ?? "Категория"}</p>
          <h1 className="screen-title wrap-break-word">{categoryLabel}</h1>
        </div>
        {board.tasks.length > 0 && (
          <Link href={createHref} className="btn-ghost">
            <PlusIcon size={18} />
            Нова задача
          </Link>
        )}
      </div>

      {board.tasks.length > 0 ? (
        // A new page starts afresh: rows held in place belong to the page they were tapped on.
        <TaskList key={board.currentPage} tasks={board.tasks} category={category} now={now} />
      ) : board.totalPages === 0 ? (
        <div className="flex flex-col items-start gap-2 rounded-card border border-line bg-surface p-3">
          <p className="text-body">В „{categoryLabel}“ още няма задачи.</p>
          <Link href={createHref} className="btn-gold">
            Създай задача
          </Link>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-2 rounded-card border border-line bg-surface p-3">
          <p className="text-body">Тази страница е празна.</p>
          <Link href={`/category/${category}`} className="btn-ghost">
            Към първата страница
          </Link>
        </div>
      )}

      <Pagination
        currentPage={board.currentPage}
        totalPages={board.totalPages}
        pageHref={(page) => `/category/${category}?page=${page}`}
      />
    </div>
  );
}
