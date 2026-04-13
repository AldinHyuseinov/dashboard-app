"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import AlertBanner from "./AlertBanner";
import Link from "next/link";

export default function Alert() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);

  const requiresVerification = searchParams.get("verify-email") === "true";
  const isVerified = searchParams.get("verified") === "true";
  const succesfullTask = searchParams.get("success") === "true";
  const succesfullLogin = searchParams.get("success-login") === "true";
  const updatedTask = searchParams.get("updated") === "true";
  const deletedTask = searchParams.get("deleted") === "true";

  // Hide completely if the user closed it, or if neither parameter is present
  if (
    !isVisible ||
    (!requiresVerification &&
      !isVerified &&
      !succesfullTask &&
      !succesfullLogin &&
      !updatedTask &&
      !deletedTask)
  ) {
    return null;
  }

  const handleClose = () => {
    setIsVisible(false);
  };

  if (pathname === "/") {
    if (requiresVerification) {
      return (
        <AlertBanner type="warning" onClose={handleClose}>
          <span>
            <strong>Имейлът е променен.</strong> Моля, проверете електронната си поща, за да
            потвърдите своя профил.
          </span>
        </AlertBanner>
      );
    } else if (isVerified) {
      return (
        <AlertBanner type="success" onClose={handleClose}>
          <span>
            <strong>Успешно!</strong> Вашият имейл е потвърден.
          </span>
        </AlertBanner>
      );
    } else if (succesfullLogin) {
      return (
        <AlertBanner type="success" onClose={handleClose}>
          <span>Успешно влизане в профила.</span>
        </AlertBanner>
      );
    }
  } else if (pathname.includes("/category/")) {
    if (requiresVerification) {
      return (
        <AlertBanner type="warning" onClose={handleClose}>
          <span>
            Необходимо е да си валидирате имейла преди да добавяте задачи. Можете да го направите
            като влезнете в профила си{" "}
            <Link href="/profile" className="underline">
              тук
            </Link>
            .
          </span>
        </AlertBanner>
      );
    } else if (succesfullTask) {
      return (
        <AlertBanner type="success" onClose={handleClose}>
          <span>Задачата е успешно създадена.</span>
        </AlertBanner>
      );
    } else if (updatedTask) {
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
