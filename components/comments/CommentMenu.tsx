"use client";

import { useEffect, useId, useRef, useState } from "react";
import { EditIcon, MoreIcon, PinIcon, TrashIcon } from "@/components/shell/icons";

/**
 * More things to do with a Comment, offered only to those allowed: pin or
 * unpin (the Task Owner, on a top-level Comment), edit and delete (the
 * author). Deleting asks first.
 */
export default function CommentMenu({
  authorName,
  canPin,
  isPinned,
  canEdit,
  canDelete,
  hasReplies,
  onPin,
  onEdit,
  onDelete,
}: {
  authorName: string;
  canPin: boolean;
  isPinned: boolean;
  canEdit: boolean;
  canDelete: boolean;
  hasReplies: boolean;
  onPin: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const close = (returnFocus: boolean) => {
    setOpen(false);
    setConfirmingDelete(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const dismiss = () => {
      setOpen(false);
      setConfirmingDelete(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) dismiss();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      dismiss();
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const item =
    "flex min-h-touch w-full cursor-pointer items-center gap-1.5 px-2 text-left text-secondary font-semibold transition-colors hover:bg-hover";

  return (
    <div ref={rootRef} className="relative -my-1 -mr-1 shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Още за коментара на ${authorName}`}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close(false) : setOpen(true))}
        className="flex size-touch cursor-pointer items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-hover hover:text-ink"
      >
        <MoreIcon size={20} />
      </button>

      {open && (
        <div
          id={menuId}
          className="absolute top-full right-0 z-20 flex w-[248px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-card border border-line bg-surface py-0.5 shadow-lg"
        >
          {confirmingDelete ? (
            <div role="alert" className="flex flex-col gap-1 p-2">
              <p className="text-secondary font-semibold">
                {hasReplies ? "Да изтрием ли коментара и отговорите му?" : "Да изтрием ли коментара?"}
              </p>
              <div className="flex gap-1">
                <button
                  type="button"
                  autoFocus
                  onClick={() => {
                    close(false);
                    onDelete();
                  }}
                  className="btn-ghost flex-1 text-error"
                >
                  Изтрий
                </button>
                <button type="button" onClick={() => close(true)} className="btn-ghost flex-1">
                  Отказ
                </button>
              </div>
            </div>
          ) : (
            <>
              {canPin && (
                <button
                  type="button"
                  onClick={() => {
                    close(true);
                    onPin();
                  }}
                  className={item}
                >
                  <PinIcon size={18} className="text-ink-2" />
                  {isPinned ? "Откачи коментара" : "Закачи най-отгоре"}
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    close(false);
                    onEdit();
                  }}
                  className={item}
                >
                  <EditIcon size={18} className="text-ink-2" />
                  Редактирай
                </button>
              )}
              {canDelete && (
                <button type="button" onClick={() => setConfirmingDelete(true)} className={`${item} text-error`}>
                  <TrashIcon size={18} />
                  Изтрий
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
