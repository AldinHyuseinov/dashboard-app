"use client";

import { deleteTask, toggleTaskStatus } from "@/actions/task-actions";
import { TaskCardProps } from "@/lib/types";
import { useTransition } from "react";

export default function TaskCard({ task, category, currentUserId, onEdit }: TaskCardProps) {
  const [isPending, startTransition] = useTransition();
  const isOwner = task.userId === currentUserId;

  const handleToggle = () => {
    startTransition(() => {
      toggleTaskStatus(task.id, !task.isDone, category);
    });
  };

  const handleDelete = () => {
    if (confirm("Сигурни ли сте, че искате да изтриете тази задача?")) {
      startTransition(() => {
        deleteTask(task.id, category);
      });
    }
  };

  return (
    <div
      className={`p-1 mb-2 rounded-lg border shadow-sm transition ${task.isDone ? "bg-gray-50 border-gray-200" : "bg-white border-secondary-gold-dark"}`}
    >
      <div className="flex justify-between items-start mb-1">
        <h3
          className={`font-bold text-lg ${task.isDone ? "line-through text-gray-400" : "text-gray-800"}`}
        >
          {task.title}
        </h3>

        {/* ANY user can mark as done */}
        <input
          type="checkbox"
          checked={task.isDone}
          onChange={handleToggle}
          disabled={isPending}
          className="w-1 accent-primary-gold cursor-pointer"
        />
      </div>

      <p
        className={`text-sm mb-4 whitespace-pre-wrap ${task.isDone ? "text-gray-400" : "text-gray-600"}`}
      >
        {task.description}
      </p>

      {task.files && task.files.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {task.files.map((file) => {
            const isImage = file.fileType.startsWith("image/");
            return (
              <a
                key={file.id}
                href={`/api/files/${file.id}`} // Links to the API route to fetch the actual Bytes
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-1 px-2 py-1 border rounded-md text-xs transition-colors ${
                  task.isDone
                    ? "border-gray-200 text-gray-400 hover:bg-gray-100"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-primary-gold"
                }`}
                title={file.fileName}
              >
                <span>{isImage ? "🖼️" : "📄"}</span>
                <span className="truncate max-w-[120px]">{file.fileName}</span>
              </a>
            );
          })}
        </div>
      )}

      {/* ONLY OWNER can edit or delete */}
      {isOwner && (
        <div className="flex gap-3 mt-2 p-1 border-t border-gray-100">
          <button onClick={onEdit} className="text-xs font-bold text-primary-gold hover:underline">
            РЕДАКТИРАЙ
          </button>
          <button onClick={handleDelete} className="text-xs font-bold text-red-500 hover:underline">
            ИЗТРИЙ
          </button>
        </div>
      )}
    </div>
  );
}
