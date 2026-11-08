"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { toggleTaskStatus } from "@/actions/task-actions";
import { whenShort } from "@/lib/sofia-time";
import { keepInPlace } from "@/lib/keep-in-place";
import { DoneIcon, NotDoneIcon } from "@/components/shell/icons";

export type TaskListItem = {
  id: string;
  title: string;
  isDone: boolean;
  updatedAt: Date;
  user: { name: string };
};

/**
 * One page of a Category's Tasks, most recently updated first. Each can be
 * marked Done or not Done right here. Marking a Task moves it to the top of
 * its Category, so the rows someone marks stay where they tapped them until
 * they leave the page; everything else follows the fresh order. `now` is
 * when the list was read.
 */
export default function TaskList({
  tasks,
  category,
  now,
}: {
  tasks: TaskListItem[];
  category: string;
  now: Date;
}) {
  const [view, setView] = useState({ tasks, rows: tasks, held: new Set<string>() });
  if (view.tasks !== tasks) {
    setView({ tasks, rows: keepInPlace(view.rows, tasks, view.held), held: view.held });
  }

  // Held from the tap on, so the list read again with the change keeps it in place.
  const hold = (taskId: string) =>
    setView((current) => ({ ...current, held: new Set(current.held).add(taskId) }));
  // A held row no longer on this page shows its new status too.
  const showConfirmed = (taskId: string, isDone: boolean) =>
    setView((current) => ({
      ...current,
      rows: current.rows.map((row) => (row.id === taskId ? { ...row, isDone } : row)),
    }));

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
      {view.rows.map((task) => (
        <li key={task.id}>
          <TaskRow
            task={task}
            href={`/category/${category}/${task.id}`}
            now={now}
            onToggle={() => hold(task.id)}
            onConfirmed={(isDone) => showConfirmed(task.id, isDone)}
          />
        </li>
      ))}
    </ul>
  );
}

function TaskRow({
  task,
  href,
  now,
  onToggle,
  onConfirmed,
}: {
  task: TaskListItem;
  href: string;
  now: Date;
  onToggle: () => void;
  onConfirmed: (isDone: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  // Shows the new status on tap, until the server has answered.
  const [shownDone, setShownDone] = useOptimistic(task.isDone);
  const [failed, setFailed] = useState(false);

  const toggle = () => {
    const next = !shownDone;
    setFailed(false);
    onToggle();
    startTransition(async () => {
      setShownDone(next);
      try {
        await toggleTaskStatus(task.id, next);
        onConfirmed(next);
      } catch {
        setFailed(true); // The status goes back to what it was.
      }
    });
  };

  return (
    <div className="flex items-center gap-1 py-1 pr-1 pl-2 transition-colors hover:bg-hover">
      <Link href={href} className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-tile py-1">
        <span
          className={`text-body font-semibold wrap-break-word ${shownDone ? "text-ink-2 line-through" : "text-ink"}`}
        >
          {task.title}
        </span>
        <span className="text-meta text-ink-2">
          {task.user.name} · <time dateTime={task.updatedAt.toISOString()}>{whenShort(task.updatedAt, now)}</time>
        </span>
        {failed && (
          <span role="alert" className="text-meta text-error">
            Статусът не се промени. Опитайте отново.
          </span>
        )}
      </Link>
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        aria-pressed={shownDone}
        aria-label={shownDone ? `${task.title}: готова. Върни като неготова` : `${task.title}: отбележи като готова`}
        className={`flex size-touch shrink-0 cursor-pointer items-center justify-center rounded-full disabled:cursor-progress ${
          shownDone ? "text-vine" : "text-ink-2 hover:text-ink"
        }`}
      >
        {shownDone ? <DoneIcon size={26} /> : <NotDoneIcon size={26} />}
      </button>
    </div>
  );
}
