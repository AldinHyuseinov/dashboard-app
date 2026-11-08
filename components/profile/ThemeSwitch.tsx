"use client";

import { useState, useTransition } from "react";
import { setThemeAction } from "@/actions/theme-actions";
import { THEMES, type Theme } from "@/lib/theme";
import { AutoThemeIcon, MoonIcon, SunIcon } from "@/components/shell/icons";

const ICONS = { light: SunIcon, auto: AutoThemeIcon, dark: MoonIcon } as const;

/** Repaints the screen in `theme` at once, as the root layout will render it. */
function showTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "auto") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

/**
 * Light, automatic or dark appearance for this device. The screen changes at
 * once; the choice is then kept in a cookie, and the server's answer brings
 * the matching status bar colour.
 */
export default function ThemeSwitch({ theme }: { theme: Theme }) {
  const [chosen, setChosen] = useState(theme);
  const [, startTransition] = useTransition();

  const choose = (next: Theme) => {
    setChosen(next);
    showTheme(next);
    startTransition(async () => {
      try {
        await setThemeAction(next);
      } catch {
        // Offline, say: the screen keeps the new look until it's reloaded.
      }
    });
  };

  return (
    <fieldset className="flex flex-col gap-1" aria-describedby="theme-hint">
      <legend className="sr-only">Изглед</legend>
      <div className="grid grid-cols-3 gap-0.5 rounded-tile border border-line bg-bg p-0.5">
        {THEMES.map(({ id, label }) => {
          const Icon = ICONS[id];
          return (
            <label
              key={id}
              className="flex min-h-7 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-[8px] px-0.5 text-label font-semibold text-ink-2 transition-colors hover:text-ink has-checked:bg-tint has-checked:text-gold-ink has-focus-visible:outline-2 has-focus-visible:outline-gold-ink"
            >
              <input
                type="radio"
                name="theme"
                value={id}
                checked={chosen === id}
                onChange={() => choose(id)}
                className="sr-only"
              />
              <Icon size={20} />
              {label}
            </label>
          );
        })}
      </div>
      <p id="theme-hint" className="text-meta text-ink-2">
        Важи за това устройство. Автоматичният следва настройката на устройството.
      </p>
    </fieldset>
  );
}
