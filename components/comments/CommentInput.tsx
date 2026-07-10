"use client";

import { useState, useRef, useEffect } from "react";

export default function CommentInput({
  onSubmit,
  placeholder = "Напиши коментар...",
  autoFocus = false,
  isPending = false,
  size = "md",
  initialValue = "",
}: {
  onSubmit: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  isPending?: boolean;
  size?: "sm" | "md";
  initialValue?: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [isScrollable, setIsScrollable] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      const el = textareaRef.current;
      el.focus();
      const length = el.value.length;
      el.setSelectionRange(length, length);
    }
  }, [autoFocus, initialValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    setValue("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setIsScrollable(false);
    onSubmit(trimmed);
  };

  const isSmall = size === "sm";
  const paddingClass = isSmall ? "p-1.5" : "p-2";
  const textStyles = "text-xs font-sans leading-relaxed break-words whitespace-pre-wrap";

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    target.style.height = "auto";
    const newHeight = target.scrollHeight;
    target.style.height = `${newHeight}px`;

    setIsScrollable(newHeight > 120);

    if (backdropRef.current) {
      backdropRef.current.scrollTop = target.scrollTop;
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (backdropRef.current) {
      backdropRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const renderBackdropText = (text: string) => {
    const displayValue = text.endsWith("\n") ? text + " " : text;
    const parts = displayValue.split(/(@[a-zA-Z0-9а-яА-ЯёЁ_]+)/g);

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

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col sm:flex-row gap-1 min-w-0 w-full items-end sm:items-center"
    >
      <div className="relative flex-1 min-w-0 w-full">
        {/* BACKDROP */}
        <div
          ref={backdropRef}
          className={`absolute inset-0 w-full h-full border border-transparent bg-white text-gray-800 select-none pointer-events-none rounded ${paddingClass} ${textStyles} ${
            isScrollable ? "overflow-y-auto" : "overflow-y-hidden"
          }`}
          aria-hidden="true"
        >
          {renderBackdropText(value)}
        </div>

        {/* FRONTEND TEXTAREA */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onInput={handleInput}
          onScroll={handleScroll}
          placeholder={placeholder}
          required
          rows={1}
          autoComplete="off"
          className={`relative z-10 w-full border border-gray-300 rounded outline-none focus:ring-1 focus:ring-primary-gold focus:border-primary-gold bg-transparent text-transparent caret-gray-800 placeholder:text-gray-400 resize-none max-h-32 ${paddingClass} ${textStyles} ${
            isScrollable ? "overflow-y-auto" : "overflow-y-hidden"
          }`}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className={` bg-primary-gold hover:bg-secondary-gold-dark text-white font-bold rounded cursor-pointer transition-colors disabled:bg-gray-400 shrink-0 whitespace-nowrap self-end sm:self-center z-10 ${
          isSmall ? "text-[10px] px-2.5 py-1.5" : "text-xs px-3 py-1.5"
        }`}
      >
        {isPending ? "..." : "Изпрати"}
      </button>
    </form>
  );
}
