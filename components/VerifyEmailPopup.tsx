"use client";

import { useSearchParams } from "next/navigation";

export default function VerifyEmailPopup() {
  const searchParams = useSearchParams();
  const requiresVerification = searchParams.get("verify-email") === "true";
  const isVerified = searchParams.get("verified") === "true";

  // 1. Show YELLOW warning if they need to check their email
  if (requiresVerification) {
    return (
      <div className="mb-1 p-1 bg-yellow-50 border border-yellow-300 text-yellow-800 text-sm md:text-base rounded-md text-center shadow-sm flex items-center justify-center gap-2">
        <span>
          <strong>Заявихте промяна на имейла.</strong> Моля, проверете електронната си поща, за да
          потвърдите и запишете новия имейл.
        </span>
      </div>
    );
  }

  // 2. Show GREEN success message if they clicked the link in their email
  if (isVerified) {
    return (
      <div className="mb-1 p-1 bg-green-50 border border-green-300 text-green-800 text-sm md:text-base rounded-md text-center shadow-sm flex items-center justify-center gap-2">
        <span>
          <strong>Успешно!</strong> Вашият имейл е потвърден.
        </span>
      </div>
    );
  }

  // 3. Hide completely if neither parameter is present in the URL
  return null;
}
