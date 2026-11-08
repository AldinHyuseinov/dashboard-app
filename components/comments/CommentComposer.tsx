"use client";

import { useState, type RefObject } from "react";
import type { Person } from "@/lib/types";
import Avatar from "@/components/shell/Avatar";
import { CloseIcon, SendIcon } from "@/components/shell/icons";

/**
 * The one box for writing a Comment, or a Reply once someone chose whom to
 * answer. The text is cleared on posting and put back if posting fails.
 */
export default function CommentComposer({
  inputRef,
  replyingTo,
  onCancelReply,
  onSubmit,
  viewer,
}: {
  inputRef: RefObject<HTMLTextAreaElement | null>;
  /** The name of whoever the Reply answers, or `null` for a Comment. */
  replyingTo: string | null;
  onCancelReply: () => void;
  /** Posts the text; resolves `false` if that failed. */
  onSubmit: (text: string) => Promise<boolean>;
  /** Who is writing. */
  viewer: Person;
}) {
  const [draft, setDraft] = useState("");
  const text = draft.trim();

  const submit = async () => {
    if (!text) return;
    setDraft("");
    const posted = await onSubmit(text);
    if (!posted) setDraft((current) => current || text);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex gap-2 rounded-card border border-line bg-surface p-2 focus-within:border-gold-ink"
    >
      <Avatar name={viewer.name} image={viewer.image} size="composer" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {replyingTo && (
          <div className="-my-1 flex items-center justify-between gap-1 text-meta text-ink-2">
            <span className="min-w-0">
              Отговаряте на <strong className="font-semibold text-ink">{replyingTo}</strong>
            </span>
            <button
              type="button"
              onClick={onCancelReply}
              className="-mr-1 inline-flex min-h-touch shrink-0 cursor-pointer items-center gap-0.5 rounded-full px-1 font-semibold hover:text-ink"
            >
              <CloseIcon size={16} />
              Отказ
            </button>
          </div>
        )}
        <label htmlFor="comment-composer" className="sr-only">
          {replyingTo ? `Отговор на ${replyingTo}` : "Коментар"}
        </label>
        <textarea
          id="comment-composer"
          ref={inputRef}
          rows={2}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            // Grows with the text, up to a scrolling limit.
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 320)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              submit();
            } else if (e.key === "Escape" && replyingTo) {
              onCancelReply();
            }
          }}
          placeholder={replyingTo ? "Вашият отговор…" : "Напишете коментар…"}
          className="w-full resize-none bg-transparent text-body text-ink outline-none placeholder:text-ink-2"
        />
        <div className="flex justify-end">
          <button type="submit" disabled={!text} className="btn-gold">
            Публикувай
            <SendIcon size={18} />
          </button>
        </div>
      </div>
    </form>
  );
}
