"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  createCommentAction,
  editCommentAction,
  pinCommentAction,
  toggleReactionAction,
  deleteCommentAction,
} from "@/actions/comment-actions";
import {
  authorName,
  commentActions,
  commentThreads,
  reactionChips,
  replyMention,
  unsavedId,
} from "@/lib/comment-view";
import type { Comment, Person, SortMode } from "@/lib/types";
import { PinIcon } from "@/components/shell/icons";
import CommentComposer from "./CommentComposer";
import CommentItem from "./CommentItem";
import CommentSortToggle from "./CommentSortToggle";

// Cheap content signature for the comment list — used to detect whether
// `initialComments` carries genuinely new server data, as opposed to just
// being a new array reference from an unrelated parent re-render (which
// happens often with Server Components + revalidatePath, and was silently
// stomping local optimistic updates before this was content-aware).
function commentsSignature(comments: Comment[]): string {
  return comments
    .map((c) => {
      const rx = (c.reactions || [])
        .map((r) => `${r.userId}:${r.emoji}`)
        .sort()
        .join(",");
      return `${c.id}|${c.text}|${c.user?.image ?? ""}|${c.isPinned ? "p" : ""}|${c.editedAt ?? ""}|${rx}`;
    })
    .sort()
    .join(";");
}

/**
 * A Task's Comments: top or newest first with the Pinned Comment leading,
 * one level of Replies, Reactions, and edit, delete and pin for those
 * allowed. Every change shows at once and is undone, with a message, if the
 * server refuses it.
 */
export default function TaskCommentsSection({
  taskId,
  taskOwnerId,
  taskOwnerName,
  initialComments = [],
  viewer,
  now,
}: {
  taskId: string;
  taskOwnerId: string;
  taskOwnerName: string;
  initialComments: Comment[];
  viewer: Person & { id: string };
  /** When the Task was read, for showing when each Comment was posted. */
  now: Date;
}) {
  const [, startTransition] = useTransition();
  const [sortMode, setSortMode] = useState<SortMode>("top");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const isTaskOwner = viewer.id === taskOwnerId;

  // Durable local copy of the comment list. We do NOT use useOptimistic here:
  // useOptimistic reverts to the base value (the `initialComments` prop) the
  // moment the transition wrapping the update finishes — not when fresh
  // server data has actually arrived. Server Components re-render for lots
  // of reasons unrelated to this specific mutation (revalidatePath from a
  // different action, an unrelated parent state change, etc.), each producing
  // a brand-new `initialComments` array reference/content.
  //
  // The tricky part: `isPending` from useTransition flips back to false as
  // soon as our own server action's promise resolves — but revalidatePath
  // delivering fresh props back down to this client component is a *separate*,
  // slightly later round-trip. So there's a window where isPending is already
  // false but props still reflect pre-mutation data; a resync during that
  // window would still stomp the optimistic update. `awaitingSync` closes
  // that gap: it's set the instant we make a local change and only cleared
  // once incoming props' content signature actually differs from what we
  // last synced — i.e. once we can prove the server caught up.
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [lastSyncedSignature, setLastSyncedSignature] = useState<string>(() =>
    commentsSignature(initialComments),
  );
  const [awaitingSync, setAwaitingSync] = useState(false);

  const incomingSignature = commentsSignature(initialComments);
  if (awaitingSync) {
    if (incomingSignature !== lastSyncedSignature) {
      setLastSyncedSignature(incomingSignature);
      setComments(initialComments);
      setAwaitingSync(false);
    }
  } else if (incomingSignature !== lastSyncedSignature) {
    setLastSyncedSignature(incomingSignature);
    setComments(initialComments);
  }

  const threads = useMemo(() => commentThreads(comments, sortMode), [comments, sortMode]);

  // Safety net: if we're waiting for the server to confirm a change but its
  // signature never diverges (e.g. a race where revalidatePath served a
  // cached snapshot identical to pre-mutation state), don't get stuck
  // ignoring all future prop updates forever.
  useEffect(() => {
    if (!awaitingSync) return;
    const timeout = setTimeout(() => setAwaitingSync(false), 8000);
    return () => clearTimeout(timeout);
  }, [awaitingSync]);

  /**
   * Sends a change already shown on screen. If the server refuses it, `undo`
   * restores the list and `failed` says what didn't happen. Resolves whether
   * the server took it.
   */
  const send = (change: () => Promise<void>, undo: () => void, failed: string) => {
    setAwaitingSync(true);
    setFailure(null);
    return new Promise<boolean>((resolve) => {
      startTransition(async () => {
        try {
          await change();
          resolve(true);
        } catch (err) {
          console.error(err);
          undo();
          setAwaitingSync(false);
          setFailure(failed);
          resolve(false);
        }
      });
    });
  };

  const unsaved = (text: string, extra: Partial<Comment>): Comment => ({
    id: unsavedId(),
    text,
    userId: viewer.id,
    user: { name: viewer.name, image: viewer.image },
    createdAt: new Date(),
    parentId: null,
    reactions: [],
    ...extra,
  });

  const postComment = (text: string) => {
    const comment = unsaved(text, {});
    setComments((prev) => [...prev, comment]);
    return send(
      () => createCommentAction({ taskId, text }),
      () => setComments((prev) => prev.filter((c) => c.id !== comment.id)),
      "Коментарът не беше публикуван. Опитайте отново.",
    );
  };

  const postReply = async (answeredId: string, text: string) => {
    // Threads are one level deep: a Reply to a Reply is filed under the
    // top-level Comment, but still records the Reply it answers.
    const answered = comments.find((c) => c.id === answeredId);
    if (!answered) {
      setFailure("Коментарът, на който отговаряте, вече е изтрит.");
      return false;
    }
    const reply = unsaved(text, { parentId: answered.parentId ?? answered.id, answersId: answeredId });
    setComments((prev) => [...prev, reply]);
    return send(
      () => createCommentAction({ taskId, text, replyToId: answeredId }),
      () => setComments((prev) => prev.filter((c) => c.id !== reply.id)),
      "Отговорът не беше публикуван. Опитайте отново.",
    );
  };

  const submit = async (text: string) => {
    const target = replyTo;
    setReplyTo(null);
    const posted = target ? await postReply(target.id, text) : await postComment(text);
    if (!posted && target) setReplyTo(target);
    return posted;
  };

  const startReply = (comment: Comment) => {
    setReplyTo({ id: comment.id, name: authorName(comment) });
    const composer = composerRef.current;
    if (!composer) return;
    composer.scrollIntoView({ block: "center", behavior: "smooth" });
    composer.focus({ preventScroll: true });
  };

  const react = (commentId: string, emoji: string) => {
    const previous = comments;
    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c;
        const rx = c.reactions || [];
        const mine = rx.findIndex((r) => r.emoji === emoji && r.userId === viewer.id);
        if (mine >= 0) return { ...c, reactions: rx.filter((_, i) => i !== mine) };
        const added = { id: unsavedId(), emoji, userId: viewer.id, user: { name: viewer.name } };
        return { ...c, reactions: [...rx, added] };
      }),
    );
    send(
      () => toggleReactionAction(commentId, emoji),
      () => setComments(previous),
      "Реакцията не се запази. Опитайте отново.",
    );
  };

  const remove = (commentId: string) => {
    const previous = comments;
    const deleted = comments.find((c) => c.id === commentId);
    // Flat model: a comment can only have direct replies, never
    // grandchildren, so one pass finds everything to remove.
    const removedIds = new Set([commentId, ...comments.filter((c) => c.parentId === commentId).map((c) => c.id)]);
    if (replyTo && removedIds.has(replyTo.id)) setReplyTo(null);
    setComments((prev) =>
      prev
        .filter((c) => !removedIds.has(c.id))
        // Replies that answered a deleted Reply now answer the top-level Comment.
        .map((c) => (c.answersId === commentId ? { ...c, answersId: deleted?.parentId ?? null } : c)),
    );
    send(
      () => deleteCommentAction(commentId),
      () => setComments(previous),
      "Коментарът не беше изтрит. Опитайте отново.",
    );
  };

  const edit = (commentId: string, text: string) => {
    const previous = comments;
    setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, text, editedAt: new Date() } : c)));
    send(
      () => editCommentAction(commentId, text),
      () => setComments(previous),
      "Промяната не се запази. Опитайте отново.",
    );
  };

  const pin = (commentId: string) => {
    const previous = comments;
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) return { ...c, isPinned: !c.isPinned };
        // Only one Pinned Comment per Task, as on the server.
        if (!c.parentId && c.isPinned) return { ...c, isPinned: false };
        return c;
      }),
    );
    send(
      () => pinCommentAction(commentId),
      () => setComments(previous),
      "Закачането не се промени. Опитайте отново.",
    );
  };

  const item = (comment: Comment, hasReplies: boolean) => {
    const shown = replyMention(comment, comments);
    return (
      <CommentItem
        comment={comment}
        isReply={Boolean(comment.parentId)}
        mention={shown?.mention ?? null}
        text={shown?.text ?? comment.text}
        actions={commentActions(comment, { viewerId: viewer.id, isTaskOwner })}
        chips={reactionChips(comment, viewer.id)}
        hasReplies={hasReplies}
        now={now}
        onReact={(emoji) => react(comment.id, emoji)}
        onReply={() => startReply(comment)}
        onEdit={(text) => edit(comment.id, text)}
        onDelete={() => remove(comment.id)}
        onPin={() => pin(comment.id)}
      />
    );
  };

  return (
    <section aria-labelledby="comments-title" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-1">
        <h2 id="comments-title" className="text-section font-semibold">
          Коментари <span className="font-medium text-ink-2">{comments.length}</span>
        </h2>
        <CommentSortToggle value={sortMode} onChange={setSortMode} />
      </div>

      <CommentComposer
        inputRef={composerRef}
        replyingTo={replyTo?.name ?? null}
        onCancelReply={() => setReplyTo(null)}
        onSubmit={submit}
        viewer={viewer}
      />

      {failure && (
        <p role="alert" className="text-meta font-semibold text-error">
          {failure}
        </p>
      )}

      {threads.length === 0 ? (
        <p className="py-3 text-center text-secondary text-ink-2">
          Още няма коментари. Напишете първия.
        </p>
      ) : (
        <ol className="flex flex-col">
          {threads.map(({ topLevel, replies }) => (
            <li key={topLevel.id} className="flex flex-col gap-1 border-t border-line py-2 lg:py-3">
              {topLevel.isPinned && (
                <p className="flex items-center gap-1 text-label font-semibold tracking-[1px] text-gold-ink">
                  <PinIcon size={16} />
                  Закачен от {taskOwnerName}
                </p>
              )}
              {item(topLevel, replies.length > 0)}
              {replies.length > 0 && (
                <ol
                  aria-label={`Отговори на ${authorName(topLevel)}`}
                  className="flex flex-col gap-1 pl-6 lg:gap-2 lg:pt-1 lg:pl-[52px]"
                >
                  {replies.map((reply) => (
                    <li key={reply.id}>{item(reply, false)}</li>
                  ))}
                </ol>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
