// components/comments/CommentThread.tsx
"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";
import { Comment } from "@/lib/types";
import CommentMenu from "./CommentMenu";
import CommentInput from "./CommentInput";

export default function CommentThread({
  topLevel,
  replies,
  currentUserId,
  isTaskOwner,
  isPending,
  onReply,
  onReact,
  onDelete,
  onEdit,
  onPin,
}: {
  topLevel: Comment;
  replies: Comment[];
  currentUserId: string;
  isTaskOwner: boolean;
  isPending: boolean;
  onReply: (parentId: string, text: string) => void;
  onReact: (commentId: string, emoji: string) => void;
  onDelete: (commentId: string) => void;
  onEdit: (commentId: string, text: string) => void;
  onPin: (commentId: string) => void;
}) {
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [isReplying, setIsReplying] = useState(false);

  const truncateQuote = (text: string, maxLength = 60) => {
    const cleanText = text.replace(/^@[a-zA-Z0-9а-яА-ЯёЁ_]+\s*/, "");
    if (cleanText.length > maxLength) {
      return cleanText.slice(0, maxLength).trim() + "...";
    }
    return cleanText;
  };

  const getReplyTargetData = (reply: Comment, index: number) => {
    const mentionMatch = reply.text.match(/^@([a-zA-Z0-9а-яА-ЯёЁ_]+)/);

    if (mentionMatch) {
      const username = mentionMatch[1];

      for (let i = index - 1; i >= 0; i--) {
        const prevReply = replies[i];
        const prevAuthor = prevReply.user?.name || "Потребител";

        if (prevAuthor === username) {
          return {
            replyingToName: prevAuthor,
            replyingToText: truncateQuote(prevReply.text),
          };
        }
      }

      const parentAuthor = topLevel.user?.name || "Потребител";
      if (parentAuthor === username) {
        return {
          replyingToName: parentAuthor,
          replyingToText: truncateQuote(topLevel.text),
        };
      }
    }

    return {
      replyingToName: topLevel.user?.name || "Потребител",
      replyingToText: truncateQuote(topLevel.text),
    };
  };

  return (
    <div className="comment-thread-container flex flex-col gap-1 min-w-0">
      <CommentCard
        comment={topLevel}
        isTopLevel
        currentUserId={currentUserId}
        isTaskOwner={isTaskOwner}
        isPending={isPending}
        isReplying={isReplying}
        onToggleReply={() => setIsReplying((v) => !v)}
        onSubmitReply={(text) => {
          onReply(topLevel.id, text);
          setIsReplying(false);
        }}
        onReact={(emoji) => onReact(topLevel.id, emoji)}
        onDelete={() => onDelete(topLevel.id)}
        onEdit={(text) => onEdit(topLevel.id, text)}
        onPin={() => onPin(topLevel.id)}
      />

      {replies.length > 0 && (
        <div className="flex flex-col gap-1 mt-1">
          {!repliesOpen ? (
            <button
              type="button"
              onClick={() => setRepliesOpen(true)}
              className="flex items-center gap-1 text-[12px] font-bold text-primary-gold hover:underline cursor-pointer w-fit"
            >
              <ChevronIcon />
              Покажи {replies.length} {replies.length === 1 ? "отговор" : "отговора"}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setRepliesOpen(false)}
                className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 hover:text-primary-gold cursor-pointer w-fit"
              >
                <ChevronIcon flipped />
                Скрий отговорите
              </button>
              {replies.map((reply, index) => {
                const targetData = getReplyTargetData(reply, index);

                return (
                  <ReplyRow
                    key={reply.id}
                    reply={reply}
                    currentUserId={currentUserId}
                    isTaskOwner={isTaskOwner}
                    isPending={isPending}
                    onReply={(text) => onReply(topLevel.id, text)}
                    onReact={onReact}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    replyingToName={targetData.replyingToName}
                    replyingToText={targetData.replyingToText}
                  />
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function CommentCard({
  comment,
  isTopLevel,
  currentUserId,
  isTaskOwner,
  isPending,
  isReplying,
  onToggleReply,
  onSubmitReply,
  onReact,
  onDelete,
  onEdit,
  onPin,
  replyingToName,
  replyingToText,
  replyPrefill,
}: {
  comment: Comment;
  isTopLevel: boolean;
  currentUserId: string;
  isTaskOwner: boolean;
  isPending: boolean;
  isReplying: boolean;
  onToggleReply: () => void;
  onSubmitReply: (text: string) => void;
  onReact: (emoji: string) => void;
  onDelete: () => void;
  onEdit: (text: string) => void;
  onPin?: () => void;
  replyingToName?: string;
  replyingToText?: string;
  replyPrefill?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(comment.text);

  const rx = comment.reactions || [];
  const reactionCounts = rx.reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});
  const activeReactions = rx.filter((r) => r.userId === currentUserId).map((r) => r.emoji);
  const hasReactions = Object.keys(reactionCounts).length > 0;
  const isOwnComment = comment.userId === currentUserId;

  const startEdit = () => {
    setEditValue(comment.text);
    setIsEditing(true);
  };

  const submitEdit = () => {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    onEdit(trimmed);
    setIsEditing(false);
  };

  const renderTextWithMentions = (text: string) => {
    const parts = text.split(/(@[a-zA-Z0-9а-яА-ЯёЁ_]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith("@")) {
        return (
          <span key={index} className="text-primary-gold font-bold">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const authorName = comment.user?.name || "Потребител";

  return (
    <div
      id={`comment-${comment.id}`}
      data-author-name={authorName}
      className={`flex flex-col gap-1 rounded-lg border min-w-0 transition-all duration-300 ${
        comment.isPinned ? "border-primary-gold/40 bg-yellow-50/40" : "border-gray-100"
      } ${
        isTopLevel ? "text-[12px] bg-gray-50/50 p-2" : "text-[12px] bg-[#fdfdfd] p-2"
      } ${comment.isPinned && !isTopLevel ? "bg-yellow-50/40" : ""}`}
    >
      {comment.isPinned && (
        <div className="flex items-center gap-1 text-[12px] font-bold text-primary-gold">
          <PinIcon />
          <span>Закачен коментар</span>
        </div>
      )}

      {replyingToName && replyingToText && (
        <div className="flex items-center gap-1 min-w-0 text-[12px] text-gray-700">
          <span className="shrink-0 text-gray-500">↳</span>
          <span className="truncate min-w-0">
            Отговор до <strong className="text-primary-gold not-italic">{replyingToName}</strong>:
            &quot;{replyingToText}&quot;
          </span>
        </div>
      )}

      <div className="flex justify-between items-center gap-x-1.5 gap-y-0.5 min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0 min-w-0 text-[10px] text-gray-500 font-bold">
          <span className="truncate min-w-0 max-w-full">{authorName}</span>
          <span className="shrink-0">
            {formatDate(comment.createdAt)}
            {comment.editedAt && <span className="font-normal text-gray-400"> (редактиран)</span>}
          </span>
        </div>
        <div className="shrink-0">
          <CommentMenu
            canDelete={isOwnComment}
            canEdit={isOwnComment}
            canPin={isTaskOwner && !!onPin}
            isPinned={!!comment.isPinned}
            onReact={onReact}
            onDelete={onDelete}
            onEdit={startEdit}
            onPin={onPin}
            activeReactions={activeReactions}
          />
        </div>
      </div>

      {isEditing ? (
        <div className="flex flex-col gap-1 mt-0.5">
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            autoFocus
            rows={2}
            className="w-full min-w-0 text-xs border border-gray-300 rounded p-1.5 outline-none focus:ring-1 focus:ring-primary-gold focus:border-primary-gold bg-white resize-none"
          />
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-[12px] font-bold text-gray-500 hover:bg-gray-100 rounded px-2 py-1 cursor-pointer transition-colors"
            >
              Отказ
            </button>
            <button
              type="button"
              onClick={submitEdit}
              disabled={isPending || !editValue.trim()}
              className="text-[12px] font-bold text-white bg-primary-gold hover:bg-secondary-gold-dark rounded px-2.5 py-1 cursor-pointer transition-colors"
            >
              Запази
            </button>
          </div>
        </div>
      ) : (
        <p
          className={`text-gray-700 whitespace-pre-wrap wrap-break-word min-w-0 leading-snug ${
            isTopLevel ? "text-[12px]" : "text-gray-600 text-[12px] leading-tight"
          }`}
        >
          {renderTextWithMentions(comment.text)}
        </p>
      )}

      {hasReactions && !isEditing && (
        <div className="flex flex-wrap items-center gap-1 mt-0.5">
          {Object.entries(reactionCounts).map(([emoji, count]) => {
            const mine = activeReactions.includes(emoji);
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact(emoji)}
                className={`px-1.5 py-0.5 rounded-full border text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-transform hover:scale-105 shadow-sm ${
                  mine
                    ? "bg-linear-to-br from-yellow-100 to-yellow-50 border-primary-gold text-primary-gold"
                    : "bg-white border-gray-200 text-gray-600"
                }`}
              >
                <span className="text-sm leading-none">{emoji}</span>
                <span>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {!isEditing && (
        <div className="flex justify-end items-center pt-1 mt-0.5 border-t border-gray-100/50">
          <button
            type="button"
            onClick={onToggleReply}
            className="text-[10px] font-bold text-gray-500 hover:text-primary-gold cursor-pointer transition-colors"
          >
            Отговори ↩
          </button>
        </div>
      )}

      {isReplying && !isEditing && (
        <div className="mt-1">
          <CommentInput
            size="sm"
            autoFocus
            isPending={isPending}
            placeholder="Напиши отговор..."
            initialValue={replyPrefill}
            onSubmit={onSubmitReply}
          />
        </div>
      )}
    </div>
  );
}

function ReplyRow({
  reply,
  currentUserId,
  isTaskOwner,
  isPending,
  onReply,
  onReact,
  onDelete,
  onEdit,
  replyingToName,
  replyingToText,
}: {
  reply: Comment;
  currentUserId: string;
  isTaskOwner: boolean;
  isPending: boolean;
  onReply: (text: string) => void;
  onReact: (commentId: string, emoji: string) => void;
  onDelete: (commentId: string) => void;
  onEdit: (commentId: string, text: string) => void;
  replyingToName: string;
  replyingToText: string;
}) {
  const [isReplying, setIsReplying] = useState(false);

  return (
    <CommentCard
      comment={reply}
      isTopLevel={false}
      currentUserId={currentUserId}
      isTaskOwner={isTaskOwner}
      isPending={isPending}
      isReplying={isReplying}
      onToggleReply={() => setIsReplying((v) => !v)}
      onSubmitReply={(text) => {
        onReply(text);
        setIsReplying(false);
      }}
      onReact={(emoji) => onReact(reply.id, emoji)}
      onDelete={() => onDelete(reply.id)}
      onEdit={(text) => onEdit(reply.id, text)}
      replyingToName={replyingToName}
      replyingToText={replyingToText}
      replyPrefill={`@${reply.user?.name || "Потребител"} `}
    />
  );
}

function PinIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
      <path d="M16 3l5 5-5.5 5.5L17 16l-5 5-2-6-5 5v-2l5-5-6-2 5-5L11 8.5 16 3z" />
    </svg>
  );
}

function ChevronIcon({ flipped = false }: { flipped?: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      className={`shrink-0 transition-transform ${flipped ? "rotate-180" : ""}`}
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
