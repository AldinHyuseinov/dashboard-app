"use client";

import { useFormStatus } from "react-dom";

export default function SubmitButton(props: {
  pendingText: string;
  defaultText: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <div className="p-1">
      <button
        type="submit"
        disabled={pending || props.disabled}
        className={`w-full p-1 rounded-md text-white font-bold tracking-wide transition-all cursor-pointer ${
          pending || props.disabled
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-primary-gold hover:bg-secondary-gold-dark"
        }`}
      >
        {pending ? props.pendingText : props.defaultText}
      </button>
    </div>
  );
}
