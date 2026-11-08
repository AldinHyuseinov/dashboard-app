"use client";

import { useFormStatus } from "react-dom";
import { signOutAction } from "@/actions/auth-actions";
import { forgetPushSubscription, showUnreadOnIcon } from "@/lib/push-browser";
import { SignOutIcon } from "@/components/shell/icons";

/** Signs out of this device, which also stops its notifications and clears the app icon's badge. */
export default function SignOutButton() {
  return (
    <form
      action={async () => {
        await Promise.all([forgetPushSubscription(), showUnreadOnIcon(0)]);
        await signOutAction();
      }}
      className="flex flex-col gap-1"
    >
      <Submit />
      <p className="text-center text-meta text-ink-2">
        Известията на това устройство спират, докато не влезете отново и не ги включите.
      </p>
    </form>
  );
}

/** The button, which says so while signing out. */
function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-ghost w-full disabled:opacity-60">
      <SignOutIcon size={18} />
      {pending ? "Излизане…" : "Излез"}
    </button>
  );
}
