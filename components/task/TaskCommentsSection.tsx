"use client";

import { useState, useTransition } from "react";
import { createCommentAction } from "@/actions/comment-actions";
import { formatDate } from "@/lib/utils";
import { Comment } from "@/lib/types";

export default function TaskCommentsSection({
  taskId,
  initialComments,
  category,
}: {
  taskId: string;
  initialComments: Comment[];
  category: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [commentText, setCommentText] = useState("");

  const handleCommentSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const formData = new FormData(e.currentTarget);
    setCommentText("");

    startTransition(async () => {
      try {
        await createCommentAction(formData, category);
      } catch (err) {
        console.error(err);
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {/* 1. Comment List */}
      <div className="flex flex-col gap-2 max-h-[45vh] overflow-y-auto pr-1">
        {initialComments.map((comment) => (
          <div
            key={comment.id}
            className="text-[12px] bg-gray-50/50 p-2.5 rounded-lg border border-gray-100 flex flex-col gap-1"
          >
            <div className="flex justify-between text-[12px] text-gray-700">
              <span>{comment.user?.name || "Потребител"}</span>
              <span>{formatDate(comment.createdAt)}</span>
            </div>
            <p className="text-gray-700 text-[14px] whitespace-pre-wrap leading-snug">
              {comment.text}
            </p>
          </div>
        ))}
        {initialComments.length === 0 && (
          <p className="text-[12px] text-gray-700 italic text-center py-6">
            Все още няма коментари към тази задача.
          </p>
        )}
      </div>

      {/* 2. Add Comment Input Form */}
      <form
        onSubmit={handleCommentSubmit}
        className="flex gap-1 mt-2 pt-4 border-t border-gray-100"
      >
        <input type="hidden" name="taskId" value={taskId} />
        <input
          name="text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Напиши коментар..."
          required
          autoComplete="off"
          className="flex-1 text-xs border border-gray-300 rounded p-2 outline-none focus:ring-1 focus:ring-primary-gold focus:border-primary-gold bg-white"
        />
        <button
          type="submit"
          disabled={isPending}
          className="bg-primary-gold hover:bg-secondary-gold-dark text-white text-xs font-bold px-0.5 py-1 rounded cursor-pointer transition-colors disabled:bg-gray-400 shrink-0"
        >
          {isPending ? "..." : "Изпрати"}
        </button>
      </form>
    </div>
  );
}
