"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import AlertBanner from "./AlertBanner";

export default function VerifyEmailPopup() {
  const searchParams = useSearchParams();
  const [isVisible, setIsVisible] = useState(true);

  const requiresVerification = searchParams.get("verify-email") === "true";
  const isVerified = searchParams.get("verified") === "true";

  // Hide completely if the user closed it, or if neither parameter is present
  if (!isVisible || (!requiresVerification && !isVerified)) {
    return null;
  }

  const handleClose = () => {
    setIsVisible(false);
  };

  // 1. Show YELLOW warning if they need to check their email
  if (requiresVerification) {
    return (
      <AlertBanner type="warning" onClose={handleClose}>
        <span>
          <strong>Имейлът е променен.</strong> Моля, проверете електронната си поща, за да
          потвърдите своя профил.
        </span>
      </AlertBanner>
    );
  }

  // 2. Show GREEN success message if they clicked the link in their email
  if (isVerified) {
    return (
      <AlertBanner type="success" onClose={handleClose}>
        <span>
          <strong>Успешно!</strong> Вашият имейл е потвърден.
        </span>
      </AlertBanner>
    );
  }

  return null;
}
