"use client";

import { useTransition } from "react";
import { deleteTask } from "@/actions/task-actions";

/** Deletes the Task after the Task Owner confirms, then returns to its Category. */
export default function DeleteTaskButton({ taskId }: { taskId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (confirm("Сигурни ли сте, че искате да изтриете тази задача?")) {
          startTransition(() => deleteTask(taskId));
        }
      }}
      className="btn-ghost text-error disabled:cursor-progress disabled:opacity-60"
    >
      {isPending ? "Изтриване…" : "Изтрий"}
    </button>
  );
}
