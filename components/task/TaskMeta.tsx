import { TaskMetaProps } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function TaskMeta({ task }: TaskMetaProps) {
  const isModified = new Date(task.updatedAt).getTime() - new Date(task.createdAt).getTime() > 2000;

  return (
    <div className="mt-1 text-xs text-gray-400 flex flex-col gap-0.5">
      <p>
        От: <span className="font-bold text-gray-600">{task.user?.name || "Неизвестен"}</span> на{" "}
        {formatDate(task.createdAt)}
      </p>
      {isModified && (
        <p className="italic text-gray-400">Редактирана на {formatDate(task.updatedAt)}</p>
      )}
    </div>
  );
}
