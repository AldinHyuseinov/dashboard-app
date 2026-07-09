"use client";

import { deleteTask, toggleTaskStatus } from "@/actions/task-actions";
import { TaskCardProps } from "@/lib/types";
import { useTransition } from "react";
import { PdfPreviewLarge } from "./FilePreview";
import TaskMeta from "./TaskMeta";

export default function TaskCard({
  task,
  category,
  currentUserId,
  onView,
}: TaskCardProps & { onView: () => void }) {
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
      className={`relative h-fit max-w-50 p-1 mb-2 rounded-lg border shadow-sm transform transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.02] hover:shadow-xl hover:z-10 hover:border-primary-gold ${
        task.isDone ? "bg-gray-50 border-gray-200" : "bg-white border-secondary-gold-dark"
      }`}
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

        <TaskMeta task={task} />
      </div>

      <p
        className={`text-sm mb-4 whitespace-pre-wrap wrap-break-word ${task.isDone ? "text-gray-400 line-through" : "text-gray-600"}`}
      >
        {task.description}
      </p>

      {/* Attachments */}
      {task.files && task.files.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mb-2 items-center">
          {task.files.map((file) => {
            const isImage = file.fileType.startsWith("image/");
            const isVideo = file.fileType.startsWith("video/");

            if (isVideo) {
              return (
                <div
                  key={file.id}
                  className="max-w-35 rounded-lg overflow-hidden border border-gray-200 bg-black"
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
                    className={`w-16 h-16 object-cover rounded-md border transition-all ${
                      task.isDone
                        ? "border-gray-200 opacity-50 grayscale hover:opacity-75"
                        : "border-gray-200 hover:border-primary-gold hover:scale-105"
                    }`}
                  />
                ) : (
                  <PdfPreviewLarge fileName={file.fileName} styleCondition={task.isDone} />
                )}
              </a>
            );
          })}
        </div>
      )}

      {/* Action Footer */}
      <div className="flex justify-end gap-3 mt-2 p-1 border-t border-gray-100">
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
