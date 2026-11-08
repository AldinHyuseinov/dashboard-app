import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getViewer } from "@/lib/session";
import { tasks } from "@/lib/tasks";
import { comments } from "@/lib/comments";
import { getCategoryLabel } from "@/lib/categories";
import { MAX_FILES } from "@/lib/constants";
import { whenShort } from "@/lib/sofia-time";
import { postedLine } from "@/lib/task-view";
import { taskHref } from "@/lib/navigation";
import Alert from "@/components/notification/Alert";
import TaskCommentsSection from "@/components/comments/TaskCommentsSection";
import Avatar from "@/components/shell/Avatar";
import { EditIcon } from "@/components/shell/icons";
import { MarkTaskOpened } from "@/components/shell/UnreadCount";
import DeleteTaskButton from "@/components/task/DeleteTaskButton";
import DoneToggle from "@/components/task/DoneToggle";
import TaskFiles from "@/components/task/TaskFiles";

/**
 * A Task: its title, description, Task Owner, Done status and files, then
 * its Comments. On phones everything is one column; on desktop the status
 * and details sit in a panel beside it. Opening it marks its Activities read.
 */
export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ category: string; taskId: string }>;
}) {
  const { taskId } = await params;

  const viewer = await getViewer();
  if (!viewer) {
    redirect("/login?not-authorized=true");
  }

  // Taken before the Task is read: anything newer may be missing from it, so stays Unread.
  const shownAt = new Date();
  const task = await tasks.get(viewer, taskId);
  if (!task) return notFound();

  const taskComments = await comments.list(viewer, taskId);
  const isOwner = task.userId === viewer.id;
  const ownerName = task.user.name;
  const ownerImage = task.user.image;
  const editHref = `${taskHref(task)}/edit`;

  const ownerActions = isOwner && (
    <div className="flex flex-wrap gap-1 lg:grid lg:grid-cols-2">
      <Link href={editHref} className="btn-ghost">
        <EditIcon size={18} />
        Редактирай
      </Link>
      <DeleteTaskButton taskId={task.id} />
    </div>
  );

  return (
    <div className="flex w-full max-w-130 flex-col gap-3 px-2 pt-3 pb-4 lg:px-6 lg:pt-1">
      <MarkTaskOpened taskId={task.id} shownAt={shownAt} />
      <Suspense fallback={null}>
        <Alert />
      </Suspense>

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,300px)] lg:gap-x-6 lg:gap-y-4">
        <header className="flex min-w-0 flex-col gap-1 lg:col-start-1 lg:row-start-1">
          <p className="eyebrow text-gold-ink">{getCategoryLabel(task.category) ?? task.category}</p>
          <h1 className="font-display text-display-sm font-light tracking-[-1px] wrap-break-word lg:text-display-lg">
            {task.title}
          </h1>
          {/* On desktop the panel beside the Task says who posted it and when. */}
          <p className="flex items-center gap-1 text-meta text-ink-2 lg:hidden">
            <Avatar name={ownerName} image={ownerImage} size="sm" />
            <span>
              <strong className="font-semibold text-ink">{ownerName}</strong> · {postedLine(task, shownAt)}
            </span>
          </p>
        </header>

        <aside
          aria-label="Данни за задачата"
          className="flex flex-col gap-2 lg:sticky lg:top-3 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:rounded-card lg:border lg:border-line lg:bg-surface lg:p-3"
        >
          <DoneToggle taskId={task.id} isDone={task.isDone} />
          <dl className="hidden grid-cols-2 gap-2 lg:grid">
            <div className="col-span-2 flex flex-col gap-0.5">
              <dt className="eyebrow text-ink-2">Публикувана от</dt>
              <dd className="flex items-center gap-1 text-secondary font-semibold">
                <Avatar name={ownerName} image={ownerImage} size="sm" />
                {ownerName}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="eyebrow text-ink-2">Създадена</dt>
              <dd className="text-secondary">{whenShort(task.createdAt, shownAt)}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="eyebrow text-ink-2">Обновена</dt>
              <dd className="text-secondary">{whenShort(task.updatedAt, shownAt)}</dd>
            </div>
            <div className="col-span-2 flex flex-col gap-0.5">
              <dt className="eyebrow text-ink-2">Файлове</dt>
              <dd className="text-secondary">
                {task.files.length} от {MAX_FILES}
              </dd>
            </div>
          </dl>
          {ownerActions && <div className="lg:border-t lg:border-line lg:pt-2">{ownerActions}</div>}
        </aside>

        <div className="flex min-w-0 flex-col gap-3 lg:col-start-1 lg:row-start-2 lg:gap-4">
          <p className="max-w-85 text-body whitespace-pre-wrap wrap-break-word">{task.description}</p>
          <TaskFiles files={task.files} />
          <TaskCommentsSection
            taskId={task.id}
            taskOwnerId={task.userId}
            taskOwnerName={ownerName}
            initialComments={taskComments}
            viewer={viewer}
            now={shownAt}
          />
        </div>
      </div>
    </div>
  );
}
