"use client";

import { AlertBannerProps } from "@/lib/types";
import { CloseIcon } from "@/components/shell/icons";

const TONES = {
  warning: "bg-tint text-ink",
  success: "bg-vine-tint text-ink",
  error: "border border-error bg-surface font-semibold text-error",
} as const;

/** A one-line message over a screen, which the person may close. */
export default function AlertBanner({ type = "warning", children, onClose }: AlertBannerProps) {
  return (
    <div
      role={type === "error" ? "alert" : "status"}
      className={`flex w-full items-center justify-between gap-1 rounded-tile py-1 pl-2 text-secondary ${onClose ? "pr-0.5" : "pr-2"} ${TONES[type]}`}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{children}</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Затвори"
          className="flex min-h-touch min-w-touch shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-2 hover:text-ink"
        >
          <CloseIcon size={18} />
        </button>
      )}
    </div>
  );
}
