"use client";

import { useFormStatus } from "react-dom";

/** The form's primary action, which names what's happening while it's pending. */
export default function SubmitButton(props: {
  pendingText: string;
  defaultText: string;
  disabled?: boolean;
  /** Space around the button; the default suits the forms not yet redesigned. */
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <div className={props.className ?? "p-2"}>
      <button type="submit" disabled={pending || props.disabled} className="btn-gold w-full">
        {pending ? props.pendingText : props.defaultText}
      </button>
    </div>
  );
}
