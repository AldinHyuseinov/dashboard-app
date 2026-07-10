"use client";

import { useEffect, useRef, useState } from "react";

const REACTION_EMOJIS = ["❤️", "🤣", "😮", "😥", "😡", "👍", "👎", "👏"];

export default function CommentMenu({
  canDelete,
  canEdit,
  canPin,
  isPinned,
  onReact,
  onDelete,
  onEdit,
  onPin,
  activeReactions,
}: {
  canDelete: boolean;
  canEdit: boolean;
  canPin: boolean;
  isPinned: boolean;
  onReact: (emoji: string) => void;
  onDelete: () => void;
  onEdit: () => void;
  onPin?: () => void;
  activeReactions: string[]; // emojis the current user has already reacted with
}) {
  const [open, setOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirmingDelete(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative shrink-0" ref={ref}>
      {/* Trigger: was accidentally sized down to w-3 h-3 (12px) — smaller
          than its own 14px icon, which is what made the dots render broken
          and made the button nearly untappable on mobile. Restored to a
          real tap target. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Опции"
        className="w-3 h-3 shrink-0 flex items-center justify-center rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute -right-2 top-3 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1.5 flex flex-col"
          style={{ width: "224px", maxWidth: "calc(100vw - 2rem)" }}
        >
          {/* Emoji grid: a plain CSS grid (4 columns) instead of flex-wrap.
              The previous flex-wrap version relied on an arbitrary Tailwind
              min() width value that collapsed unpredictably, causing every
              emoji to stack one-per-row instead of flowing side by side.
              A fixed 4-column grid can't collapse like that regardless of
              how the popover's own width resolves. */}
          <div className="px-2.5 pb-1.5 mb-1 border-b border-gray-100 grid grid-cols-4 gap-1 justify-items-center">
            {REACTION_EMOJIS.map((emoji) => {
              const active = activeReactions.includes(emoji);
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onReact(emoji);
                    setOpen(false);
                  }}
                  className={`text-base w-3 h-3 flex items-center justify-center rounded-full transition-transform hover:scale-125 cursor-pointer ${
                    active ? "bg-yellow-100 ring-1 ring-primary-gold" : "hover:bg-gray-100"
                  }`}
                >
                  {emoji}
                </button>
              );
            })}
          </div>

          {canPin && onPin && (
            <button
              type="button"
              onClick={() => {
                onPin();
                setOpen(false);
              }}
              className="text-left px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <PinIcon />
              {isPinned ? "Откачи коментар" : "Закачи коментар"}
            </button>
          )}

          {canEdit && (
            <button
              type="button"
              onClick={() => {
                onEdit();
                setOpen(false);
              }}
              className="text-left px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <EditIcon />
              Редактирай
            </button>
          )}

          {canDelete && (
            <>
              {!confirmingDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="text-left px-2.5 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 cursor-pointer transition-colors"
                >
                  Изтрий коментар
                </button>
              ) : (
                <div className="px-2.5 py-1.5 flex flex-col gap-1">
                  <span className="text-[11px] text-gray-500">Сигурни ли сте?</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onDelete();
                        setOpen(false);
                        setConfirmingDelete(false);
                      }}
                      className="flex-1 text-[11px] font-bold text-white bg-red-500 hover:bg-red-600 rounded px-2 py-1 cursor-pointer transition-colors"
                    >
                      Изтрий
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(false)}
                      className="flex-1 text-[11px] font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded px-2 py-1 cursor-pointer transition-colors"
                    >
                      Отказ
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function PinIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
      <path d="M16 3l5 5-5.5 5.5L17 16l-5 5-2-6-5 5v-2l5-5-6-2 5-5L11 8.5 16 3z" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="shrink-0"
    >
      <path d="M12 20h9" strokeLinecap="round" />
      <path
        d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
