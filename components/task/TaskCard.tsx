"use client";

import { deleteTask, toggleTaskStatus } from "@/actions/task-actions";
import { TaskCardProps } from "@/lib/types";
import { formatDate } from "@/lib/utils";
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

  const isModified = new Date(task.updatedAt).getTime() - new Date(task.createdAt).getTime() > 2000;

  return (
    <div
      className={`p-1 mb-2 max-w-50 rounded-lg border shadow-sm transition ${task.isDone ? "bg-gray-50 border-gray-200" : "bg-white border-secondary-gold-dark"}`}
    >
      <div className="flex flex-col justify-between items-start mb-1">
        <h3
          className={`flex gap-1 font-bold text-lg ${task.isDone ? "line-through text-gray-400" : "text-gray-800"}`}
        >
          {task.title}

          <input
            type="checkbox"
            checked={task.isDone}
            onChange={handleToggle}
            disabled={isPending}
            className="w-1 accent-primary-gold cursor-pointer"
          />
        </h3>

        <div className="mt-1 text-xs text-gray-400 flex flex-col gap-0.5">
          <p>
            От: <span className="font-bold text-gray-600">{task.user?.name || "Неизвестен"}</span>{" "}
            на {formatDate(task.createdAt)}
          </p>
          {isModified && (
            <p className="italic text-gray-400">Редактирана на {formatDate(task.updatedAt)}</p>
          )}
        </div>
      </div>

      <p
        className={`text-sm mb-2 whitespace-pre-wrap ${task.isDone ? "text-gray-400" : "text-gray-600"}`}
      >
        {task.description}
      </p>

      {/* --- Updated File Display Section --- */}
      {task.files && task.files.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mb-2">
          {task.files.map((file) => {
            const isImage = file.fileType.startsWith("image/");
            return (
              <a
                key={file.id}
                href={`/api/files/${file.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
                title={file.fileName}
              >
                {isImage ? (
                  /* Image Thumbnail */
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/files/${file.id}`}
                    alt={file.fileName}
                    className={`w-16 h-16 object-cover rounded-md border transition-all ${
                      task.isDone
                        ? "border-gray-200 opacity-50 grayscale hover:opacity-75"
                        : "border-gray-200 hover:border-primary-gold hover:scale-105"
                    }`}
                  />
                ) : (
                  /* PDF */
                  <div
                    className={`w-16 h-16 border rounded-md flex flex-col items-center justify-between p-1 bg-red-50/30 transition-all select-none ${
                      task.isDone
                        ? "border-gray-200 opacity-50 grayscale"
                        : "border-gray-200 hover:border-red-500 hover:scale-105"
                    }`}
                  >
                    {/* PDF Badge */}
                    <span className="bg-red-600 text-white font-black text-[8px] px-1 rounded-sm uppercase tracking-wider leading-normal">
                      PDF
                    </span>

                    {/* Center Icon */}
                    <span className="text-5xl leading-none">📄</span>

                    {/* Truncated Name at Bottom */}
                    <span
                      className={`text-[16px] font-medium truncate w-full text-center px-0.5 ${
                        task.isDone ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      {file.fileName}
                    </span>
                  </div>
                )}
              </a>
            );
          })}
        </div>
      )}

      <div className="flex justify-end gap-3 mt-2 p-1 border-t border-gray-100">
        <button
          onClick={onEdit}
          className="text-xs font-bold text-primary-gold hover:underline cursor-pointer"
        >
          ВИЖ
        </button>

        {isOwner && (
          <button
            onClick={handleDelete}
            className="text-xs font-bold text-red-500 hover:underline cursor-pointer"
          >
            ИЗТРИЙ
          </button>
        )}
      </div>
    </div>
  );
}
