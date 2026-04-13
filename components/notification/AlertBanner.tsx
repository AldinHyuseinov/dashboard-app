"use client";

import { AlertBannerProps } from "@/lib/types";

export default function AlertBanner({ type = "warning", children, onClose }: AlertBannerProps) {
  const colorStyles = {
    warning: "bg-yellow-50 border-yellow-300 text-yellow-800",
    success: "bg-green-50 border-green-300 text-green-800",
    error: "bg-red-50 border-red-300 text-red-800",
  };

  return (
    <div
      className={`mb-1 p-1.5 border text-sm md:text-base rounded-md shadow-sm flex items-center justify-between gap-1 ${colorStyles[type]}`}
    >
      <div className="flex flex-1 items-center justify-center gap-2 text-center">{children}</div>

      {/* Conditionally render the close button if onClose is provided */}
      {onClose && (
        <button
          onClick={onClose}
          className="px-2 font-bold opacity-60 hover:opacity-100 transition-opacity cursor-pointer leading-none"
          title="Затвори"
          type="button"
        >
          ✕
        </button>
      )}
    </div>
  );
}
