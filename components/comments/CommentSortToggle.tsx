"use client";

import { SortMode } from "@/lib/types";

export default function CommentSortToggle({
  value,
  onChange,
}: {
  value: SortMode;
  onChange: (mode: SortMode) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 text-[12px] font-bold text-gray-500">
      <SortIcon />
      <button
        type="button"
        onClick={() => onChange("top")}
        className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
          value === "top" ? "text-gray-900" : "hover:text-gray-700"
        }`}
      >
        Най-добри
      </button>
      <span className="text-gray-300">·</span>
      <button
        type="button"
        onClick={() => onChange("newest")}
        className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
          value === "newest" ? "text-gray-900" : "hover:text-gray-700"
        }`}
      >
        Най-нови
      </button>
    </div>
  );
}

function SortIcon() {
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
      <path d="M3 6h18M6 12h12M10 18h4" strokeLinecap="round" />
    </svg>
  );
}
