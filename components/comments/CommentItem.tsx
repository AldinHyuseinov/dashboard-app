"use client";

import { useState } from "react";
import type { Comment } from "@/lib/types";
import { authorName as authorNameOf, type CommentActions, type ReactionChip } from "@/lib/comment-view";
import { REACTION_EMOJIS } from "@/lib/constants";
import { whenShort } from "@/lib/sofia-time";
import Avatar from "@/components/shell/Avatar";
import { ReactIcon, ReplyIcon } from "@/components/shell/icons";
import CommentMenu from "./CommentMenu";

/** "@Name" mentions written in a Comment's text, picked out in gold. */
function withMentions(text: string) {
  return text.split(/(@[a-zA-Z0-9а-яА-ЯёЁ_]+)/g).map((part, index) =>
    part.startsWith("@") ? (
      <span key={index} className="font-semibold text-gold-ink">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

/**
 * One Comment or Reply: who wrote it and when, its text (a Reply leads with
 * whom it answers), its Reactions, and what the viewer may do with it.
 */
export default function CommentItem({
  comment,
  isReply,
  mention,
  text,
  actions,
  chips,
  hasReplies,
  now,
  onReact,
  onReply,
  onEdit,
  onDelete,
  onPin,
}: {
  comment: Comment;
  isReply: boolean;
  /** Whom a Reply answers, as "@Name", shown before its text. */
  mention: string | null;
  /** The text to show, without a mention it repeats. */
  text: string;
  actions: CommentActions;
  chips: readonly ReactionChip[];
  hasReplies: boolean;
  now: Date;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onEdit: (text: string) => void;
  onDelete: () => void;
  onPin: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(comment.text);

  const authorName = authorNameOf(comment);
  const createdAt = new Date(comment.createdAt);
  const hasMenu = actions.canPin || actions.canEdit || actions.canDelete;

  const saveEdit = () => {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    onEdit(trimmed);
    setEditing(false);
  };

  return (
    <article id={`comment-${comment.id}`} className={`flex ${isReply ? "gap-1 lg:gap-2" : "gap-2"}`}>
      <Avatar name={authorName} image={comment.user.image} size={isReply ? "sm" : "md"} />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-start justify-between gap-1">
          <p className="min-w-0 text-meta text-ink-2 lg:text-secondary">
            <strong className="font-semibold text-ink">{authorName}</strong>
            {" · "}
            <time dateTime={createdAt.toISOString()}>{whenShort(createdAt, now)}</time>
            {comment.editedAt && " · редактиран"}
          </p>
          {hasMenu && !editing && (
            <CommentMenu
              authorName={authorName}
              canPin={actions.canPin}
              isPinned={Boolean(comment.isPinned)}
              canEdit={actions.canEdit}
              canDelete={actions.canDelete}
              hasReplies={hasReplies}
              onPin={onPin}
              onEdit={() => {
                setEditValue(comment.text);
                setEditing(true);
              }}
              onDelete={onDelete}
            />
          )}
        </div>

        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveEdit();
            }}
            className="flex flex-col gap-1"
          >
            <label htmlFor={`edit-${comment.id}`} className="sr-only">
              Редактиране на коментара
            </label>
            <textarea
              id={`edit-${comment.id}`}
              autoFocus
              rows={3}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
              className="w-full resize-y rounded-tile border border-line bg-surface px-2 py-1 text-body text-ink focus:border-gold-ink focus-visible:outline-offset-0"
            />
            <div className="flex justify-end gap-1">
              <button type="button" onClick={() => setEditing(false)} className="btn-ghost">
                Отказ
              </button>
              <button type="submit" disabled={!editValue.trim()} className="btn-gold">
                Запази
              </button>
            </div>
          </form>
        ) : (
          <p className="text-body whitespace-pre-wrap wrap-break-word">
            {mention && <span className="font-semibold text-gold-ink">{mention}</span>}
            {mention && " "}
            {withMentions(text)}
          </p>
        )}

        {!editing && (actions.canReact || chips.length > 0) && (
          <div className="-ml-1 flex flex-wrap items-center gap-x-1">
            {chips.map((chip) => (
              <button
                key={chip.emoji}
                type="button"
                disabled={!actions.canReact}
                onClick={() => onReact(chip.emoji)}
                aria-pressed={chip.mine}
                aria-label={`${chip.emoji} – ${chip.count}${chip.mine ? ", включително вашата" : ""}`}
                className="ml-1 inline-flex min-h-touch cursor-pointer items-center disabled:cursor-default"
              >
                <span
                  className={`inline-flex h-4 items-center gap-0.5 rounded-full border px-1.5 text-secondary font-semibold ${
                    chip.mine ? "border-gold bg-tint text-ink" : "border-line bg-surface text-ink-2"
                  }`}
                >
                  {chip.emoji} {chip.count}
                </span>
              </button>
            ))}
            {/* On phones the actions start a line of their own under the chips. */}
            {chips.length > 0 && <span className="basis-full lg:hidden" aria-hidden="true" />}
            {actions.canReact && (
              <button
                type="button"
                aria-expanded={pickerOpen}
                onClick={() => setPickerOpen((open) => !open)}
                className="inline-flex min-h-touch cursor-pointer items-center gap-1 px-1 text-meta font-semibold text-ink-2 hover:text-ink"
              >
                <ReactIcon size={18} />
                Реагирай
              </button>
            )}
            {actions.canReply && (
              <button
                type="button"
                onClick={() => {
                  setPickerOpen(false);
                  onReply();
                }}
                className="inline-flex min-h-touch cursor-pointer items-center gap-1 px-1 text-meta font-semibold text-ink-2 hover:text-ink"
              >
                <ReplyIcon size={18} />
                Отговори
              </button>
            )}
          </div>
        )}

        {pickerOpen && !editing && (
          <div
            role="group"
            aria-label="Изберете реакция"
            onKeyDown={(e) => e.key === "Escape" && setPickerOpen(false)}
            className="grid grid-cols-4 self-start rounded-card border border-line bg-surface p-0.5 sm:grid-cols-8"
          >
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                aria-pressed={chips.some((chip) => chip.emoji === emoji && chip.mine)}
                onClick={() => {
                  setPickerOpen(false);
                  onReact(emoji);
                }}
                className="flex size-touch cursor-pointer items-center justify-center rounded-tile text-[22px] transition-colors hover:bg-hover aria-pressed:bg-tint"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
