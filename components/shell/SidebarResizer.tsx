"use client";

import { SIDEBAR_WIDTH } from "@/lib/sidebar";
import { useSidebar } from "./ShellFrame";

/** One arrow-key press moves the edge this far (px); Shift moves it further. */
const KEY_STEP = 16;
const KEY_STEP_BIG = 64;

/**
 * The strip along the sidebar's right edge. Drag it, or focus it and use the
 * arrow keys, Home and End, to make the sidebar narrower or wider. The sidebar
 * sits against the left edge of the screen, so the pointer's x is its width.
 */
export default function SidebarResizer() {
  const { width, setWidth, setResizing, saveWidth } = useSidebar();

  function onKeyDown(event: React.KeyboardEvent) {
    const step = event.shiftKey ? KEY_STEP_BIG : KEY_STEP;
    const next =
      event.key === "ArrowLeft"
        ? width - step
        : event.key === "ArrowRight"
          ? width + step
          : event.key === "Home"
            ? SIDEBAR_WIDTH.min
            : event.key === "End"
              ? SIDEBAR_WIDTH.max
              : null;
    if (next === null) return;
    event.preventDefault();
    setWidth(next);
    saveWidth();
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setResizing(true);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) setWidth(event.clientX);
  }

  function onPointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setResizing(false);
    saveWidth();
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Ширина на менюто"
      aria-valuemin={SIDEBAR_WIDTH.min}
      aria-valuemax={SIDEBAR_WIDTH.max}
      aria-valuenow={width}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      className="absolute inset-y-0 right-0 z-10 w-1 cursor-col-resize touch-none bg-transparent transition-colors hover:bg-bar-line focus-visible:bg-bar-line focus-visible:outline-bar-ink active:bg-bar-line"
    />
  );
}
