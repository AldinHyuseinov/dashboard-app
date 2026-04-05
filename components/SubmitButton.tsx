"use client";

import { useFormStatus } from "react-dom";

export default function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <div className="p-1">
      <button
        type="submit"
        disabled={pending}
        className={`w-full p-1 rounded-md text-white font-bold tracking-wide transition-all cursor-pointer ${
          pending
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-primary-gold hover:bg-secondary-gold-dark"
        }`}
      >
        {pending ? "Влизане..." : "ВХОД"}
      </button>
    </div>
  );
}
