import type { InputHTMLAttributes } from "react";

/** A labelled text field in the design system, with its first error beneath it. */
export default function TextField({
  id,
  label,
  error,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  error?: string;
}) {
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-secondary font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        name={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="min-h-6 w-full rounded-tile border border-line bg-surface px-2 text-body text-ink transition-colors placeholder:text-ink-2/70 focus:border-gold-ink focus-visible:outline-offset-0 aria-invalid:border-error"
        {...input}
      />
      {error && (
        <p id={errorId} className="text-meta font-semibold text-error">
          {error}
        </p>
      )}
    </div>
  );
}
