"use client";

import { deleteTask, toggleTaskStatus } from "@/actions/task-actions";
import { TaskCardProps } from "@/lib/types";
import { useOptimistic, useTransition } from "react";
import { PdfPreviewLarge } from "./FilePreview";
import TaskMeta from "./TaskMeta";

export default function TaskCard({
  task,
  currentUserId,
  onView,
}: TaskCardProps) {
  const [isPending, startTransition] = useTransition();
  // Shows the new status on click; the board refreshes once the server confirms it.
  const [isDone, setOptimisticDone] = useOptimistic(task.isDone);
  const isOwner = task.userId === currentUserId;

  const handleToggle = () => {
    startTransition(async () => {
      setOptimisticDone(!isDone);
      await toggleTaskStatus(task.id, !isDone);
    });
  };

  const handleDelete = () => {
    if (confirm("Сигурни ли сте, че искате да изтриете тази задача?")) {
      startTransition(() => {
        deleteTask(task.id);
      });
    }
  };

  return (
    <div
      className={`relative h-fit max-w-100 p-2 mb-4 rounded-lg border shadow-sm transform transition-all duration-300 hover:-translate-y-3 hover:scale-[1.02] hover:shadow-xl hover:z-10 hover:border-primary-gold ${
        isDone ? "bg-gray-50 border-gray-200" : "bg-white border-secondary-gold-dark"
      }`}
    >
      <div className="flex flex-col justify-between items-start mb-2">
        <h3
          className={`flex gap-2 font-bold text-lg ${isDone ? "line-through text-gray-400" : "text-gray-800"}`}
        >
          {task.title}

          <input
            type="checkbox"
            checked={isDone}
            onChange={handleToggle}
            disabled={isPending}
            className="w-2 accent-primary-gold cursor-pointer"
          />
        </h3>

        <TaskMeta task={task} />
      </div>

      <p
        className={`text-sm mb-8 whitespace-pre-wrap wrap-break-word ${isDone ? "text-gray-400 line-through" : "text-gray-600"}`}
      >
        {task.description}
      </p>

      {/* Attachments */}
      {task.files && task.files.length > 0 && (
        <div className="flex flex-wrap justify-center gap-4 mb-4 items-center">
          {task.files.map((file) => {
            const isImage = file.fileType.startsWith("image/");
            const isVideo = file.fileType.startsWith("video/");

            if (isVideo) {
              return (
                <div
                  key={file.id}
                  className="max-w-70 rounded-lg overflow-hidden border border-gray-200 bg-black"
                >
                  <video
                    src={`/api/files/${file.id}`}
                    controls
                    preload="metadata"
                    className="w-full h-full block"
                  />
                </div>
              );
            }

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
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/files/${file.id}`}
                    alt={file.fileName}
                    className={`w-32 h-32 object-cover rounded-md border transition-all ${
                      isDone
                        ? "border-gray-200 opacity-50 grayscale hover:opacity-75"
                        : "border-gray-200 hover:border-primary-gold hover:scale-105"
                    }`}
                  />
                ) : (
                  <PdfPreviewLarge fileName={file.fileName} styleCondition={isDone} />
                )}
              </a>
            );
          })}
        </div>
      )}

      {/* Action Footer */}
      <div className="flex justify-end gap-6 mt-4 p-2 border-t border-gray-100">
        {/* VIEW BUTTON (Now triggers onView) */}
        <button
          onClick={onView}
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
