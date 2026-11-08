"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import AlertBanner from "./AlertBanner";

export default function Alert() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);

  const succesfullLogin = searchParams.get("success-login") === "true";
  const updatedTask = searchParams.get("updated") === "true";
  const deletedTask = searchParams.get("deleted") === "true";

  // Hide completely if the user closed it, or if no parameter is present
  if (!isVisible || (!succesfullLogin && !updatedTask && !deletedTask)) {
    return null;
  }

  const handleClose = () => {
    setIsVisible(false);
  };

  if (pathname === "/") {
    if (succesfullLogin) {
      return (
        <AlertBanner type="success" onClose={handleClose}>
          <span>Успешно влизане в профила.</span>
        </AlertBanner>
      );
    }
  } else if (pathname.includes("/category/")) {
    if (updatedTask) {
      return (
        <AlertBanner type="success" onClose={handleClose}>
          <span>Задачата е успешно променена.</span>
        </AlertBanner>
      );
    } else if (deletedTask) {
      return (
        <AlertBanner type="warning" onClose={handleClose}>
          <span>Задачата е изтрита.</span>
        </AlertBanner>
      );
    }
  }

  return null;
}
