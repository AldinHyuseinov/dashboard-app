"use client";

import { useOptimistic, useState, useTransition } from "react";
import { toggleTaskStatus } from "@/actions/task-actions";
import { DoneIcon, NotDoneIcon } from "@/components/shell/icons";

/**
 * Marks the Task Done or not Done. Anyone may. The new status shows on tap
 * and goes back if the server refuses it.
 */
export default function DoneToggle({ taskId, isDone }: { taskId: string; isDone: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [shownDone, setShownDone] = useOptimistic(isDone);
  const [failed, setFailed] = useState(false);

  const toggle = () => {
    const next = !shownDone;
    setFailed(false);
    startTransition(async () => {
      setShownDone(next);
      try {
        await toggleTaskStatus(taskId, next);
      } catch {
        setFailed(true);
      }
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        aria-pressed={shownDone}
        className={`btn-ghost w-full disabled:cursor-progress sm:w-auto lg:w-full ${
          shownDone ? "border-transparent bg-vine-tint text-vine hover:bg-vine-tint" : ""
        }`}
      >
        {shownDone ? <DoneIcon size={20} /> : <NotDoneIcon size={20} />}
        {shownDone ? "Готова" : "Отбележи като готова"}
      </button>
      {failed && (
        <p role="alert" className="text-meta font-semibold text-error">
          Статусът не се промени. Опитайте отново.
        </p>
      )}
    </div>
  );
}
