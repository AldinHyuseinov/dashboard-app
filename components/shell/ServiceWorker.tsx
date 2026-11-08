"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/push-browser";

/**
 * Registers the service worker once a screen has loaded, so the No
 * connection screen is ready before the connection drops.
 */
export default function ServiceWorker() {
  useEffect(() => {
    registerServiceWorker().catch(() => {}); // No worker, no offline screen: the app still works.
  }, []);
  return null;
}
