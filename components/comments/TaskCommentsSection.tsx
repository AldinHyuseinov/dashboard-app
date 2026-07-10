"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  createCommentAction,
  editCommentAction,
  pinCommentAction,
  toggleReactionAction,
  deleteCommentAction,
} from "@/actions/comment-actions";
import { Comment, CommentThreadData, SortMode } from "@/lib/types";
import CommentThread from "./CommentThread";
import CommentInput from "./CommentInput";
import CommentSortToggle from "./CommentSortToggle";

// Groups the flat comment list into YouTube-style threads: each top-level
// comment paired with its flat list of replies (chronological, oldest
// first — matches YouTube). No recursion needed since threading is capped
// at exactly one level by the server action itself.
function groupIntoThreads(comments: Comment[], sortMode: SortMode): CommentThreadData[] {
  const topLevel = comments.filter((c) => !c.parentId);
  const repliesByParent = new Map<string, Comment[]>();

  for (const c of comments) {
    if (!c.parentId) continue;
    const list = repliesByParent.get(c.parentId) || [];
    list.push(c);
    repliesByParent.set(c.parentId, list);
  }

  for (const list of repliesByParent.values()) {
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  const threads: CommentThreadData[] = topLevel.map((t) => ({
    topLevel: t,
    replies: repliesByParent.get(t.id) || [],
  }));

  const reactionCount = (c: Comment) => (c.reactions || []).length;

  threads.sort((a, b) => {
    // Pinned always first, regardless of sort mode — matches YouTube.
    if (a.topLevel.isPinned && !b.topLevel.isPinned) return -1;
    if (!a.topLevel.isPinned && b.topLevel.isPinned) return 1;

    if (sortMode === "newest") {
      return new Date(b.topLevel.createdAt).getTime() - new Date(a.topLevel.createdAt).getTime();
    }

    // "Top": ranked by reaction count (our stand-in for YouTube's like
    // count, since this app uses multi-emoji reactions instead of a single
    // like button), falling back to newest first on ties.
    const countDiff = reactionCount(b.topLevel) - reactionCount(a.topLevel);
    if (countDiff !== 0) return countDiff;
    return new Date(b.topLevel.createdAt).getTime() - new Date(a.topLevel.createdAt).getTime();
  });

  return threads;
}

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
      return `${c.id}|${c.text}|${c.isPinned ? "p" : ""}|${c.editedAt ?? ""}|${rx}`;
    })
    .sort()
    .join(";");
}

export default function TaskCommentsSection({
  taskId,
  taskOwnerId,
  initialComments = [],
  category,
  currentUserId,
}: {
  taskId: string;
  taskOwnerId: string;
  initialComments: Comment[];
  category: string;
  currentUserId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [sortMode, setSortMode] = useState<SortMode>("top");

  // If taskOwnerId wasn't passed from the parent (a very likely gap the
  // first time this prop is wired up — it's new), isTaskOwner silently
  // evaluates to false and pin just vanishes with no indication why. Warn
  // loudly in dev so this is easy to catch instead of looking like a mystery
  // bug in the component itself.
  if (process.env.NODE_ENV !== "production" && !taskOwnerId) {
    console.warn(
      "[TaskCommentsSection] taskOwnerId is missing/empty — pin will be unavailable to everyone, including the actual task owner. Make sure the parent page passes task.userId as taskOwnerId.",
    );
  }

  const isTaskOwner = Boolean(taskOwnerId) && currentUserId === taskOwnerId;

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

  const threads = useMemo(() => groupIntoThreads(comments, sortMode), [comments, sortMode]);

  // Safety net: if we're waiting for the server to confirm a change but its
  // signature never diverges (e.g. a race where revalidatePath served a
  // cached snapshot identical to pre-mutation state), don't get stuck
  // ignoring all future prop updates forever.
  useEffect(() => {
    if (!awaitingSync) return;
    const timeout = setTimeout(() => setAwaitingSync(false), 8000);
    return () => clearTimeout(timeout);
  }, [awaitingSync]);

  const handleNewComment = (text: string) => {
    const optimisticComment: Comment = {
      id: `optimistic-${Date.now()}`,
      text,
      userId: currentUserId,
      user: { name: "Вие" },
      createdAt: new Date(),
      parentId: null,
      reactions: [],
    };

    setComments((prev) => [...prev, optimisticComment]);
    setAwaitingSync(true);

    startTransition(async () => {
      try {
        await createCommentAction({ taskId, text, parentId: null }, category);
      } catch (err) {
        console.error(err);
        setComments((prev) => prev.filter((c) => c.id !== optimisticComment.id));
        setAwaitingSync(false);
      }
    });
  };

  const handleReply = (parentId: string, text: string) => {
    const optimisticComment: Comment = {
      id: `optimistic-${Date.now()}`,
      text,
      userId: currentUserId,
      user: { name: "Вие" },
      createdAt: new Date(),
      parentId,
      reactions: [],
    };

    setComments((prev) => [...prev, optimisticComment]);
    setAwaitingSync(true);

    startTransition(async () => {
      try {
        // The server resolves reply-to-a-reply up to the top-level comment
        // automatically (see createCommentAction), keeping threading flat.
        await createCommentAction({ taskId, text, parentId }, category);
      } catch (err) {
        console.error(err);
        setComments((prev) => prev.filter((c) => c.id !== optimisticComment.id));
        setAwaitingSync(false);
      }
    });
  };

  const applyReaction = (list: Comment[], commentId: string, emoji: string): Comment[] =>
    list.map((c) => {
      if (c.id !== commentId) return c;
      const rx = c.reactions || [];
      const existingIdx = rx.findIndex((r) => r.emoji === emoji && r.userId === currentUserId);
      if (existingIdx >= 0) {
        return { ...c, reactions: rx.filter((_, i) => i !== existingIdx) };
      }
      return {
        ...c,
        reactions: [
          ...rx,
          {
            id: `optimistic-${Date.now()}`,
            emoji,
            userId: currentUserId,
            user: { name: "Вие" },
          },
        ],
      };
    });

  const handleReact = (commentId: string, emoji: string) => {
    const previous = comments;
    setComments((prev) => applyReaction(prev, commentId, emoji));
    setAwaitingSync(true);

    startTransition(async () => {
      try {
        await toggleReactionAction(commentId, emoji, category);
      } catch (err) {
        console.error(err);
        setComments(previous);
        setAwaitingSync(false);
      }
    });
  };

  const handleDelete = (commentId: string) => {
    const previous = comments;

    setComments((prev) => {
      // Flat model: a comment can only have direct replies, never
      // grandchildren, so a single filter pass is enough.
      const idsToRemove = new Set<string>([commentId]);
      for (const c of prev) {
        if (c.parentId === commentId) idsToRemove.add(c.id);
      }
      return prev.filter((c) => !idsToRemove.has(c.id));
    });
    setAwaitingSync(true);

    startTransition(async () => {
      try {
        await deleteCommentAction(commentId, category);
      } catch (err) {
        console.error(err);
        setComments(previous);
        setAwaitingSync(false);
      }
    });
  };

  const handleEdit = (commentId: string, text: string) => {
    const previous = comments;
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, text, editedAt: new Date() } : c)),
    );
    setAwaitingSync(true);

    startTransition(async () => {
      try {
        await editCommentAction(commentId, text, category);
      } catch (err) {
        console.error(err);
        setComments(previous);
        setAwaitingSync(false);
      }
    });
  };

  const handlePin = (commentId: string) => {
    const previous = comments;
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) return { ...c, isPinned: !c.isPinned };
        // Unpinning any other top-level comment mirrors the server's
        // "only one pinned comment per task" invariant.
        if (!c.parentId && c.isPinned) return { ...c, isPinned: false };
        return c;
      }),
    );
    setAwaitingSync(true);

    startTransition(async () => {
      try {
        await pinCommentAction(commentId, taskId, category);
      } catch (err) {
        console.error(err);
        setComments(previous);
        setAwaitingSync(false);
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1 items-center justify-between">
        <span className="text-sm font-bold text-gray-800">
          {comments.length} {comments.length === 1 ? "коментар" : "коментара"}
        </span>
        <CommentSortToggle value={sortMode} onChange={setSortMode} />
      </div>

      {/* Comment Feed */}
      <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto">
        {threads.map((thread, position) => (
          <div
            key={thread.topLevel.id}
            data-comment-position={position}
            data-comment-id={thread.topLevel.id}
            className="border-b border-gray-100 pb-2 last:border-0 last:pb-0"
          >
            <CommentThread
              topLevel={thread.topLevel}
              replies={thread.replies}
              currentUserId={currentUserId}
              isTaskOwner={isTaskOwner}
              isPending={isPending}
              onReply={handleReply}
              onReact={handleReact}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onPin={handlePin}
            />
          </div>
        ))}

        {threads.length === 0 && (
          <p className="text-xs text-gray-400 italic text-center py-6">
            Все още няма коментари към тази задача.
          </p>
        )}
      </div>

      {/* Top-Level Comment Form */}
      <div className="mt-2 pt-3 border-t border-gray-100">
        <CommentInput onSubmit={handleNewComment} isPending={isPending} />
      </div>
    </div>
  );
}
