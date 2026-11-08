import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import TaskForm from "./TaskForm";

/**
 * New task's form, for a Category chosen already or, on desktop, beside it.
 * Only someone signed in with a confirmed email address may post.
 */
export default async function NewTaskScreen({
  category,
  secondStep,
  cancelHref,
}: {
  category?: string;
  secondStep: boolean;
  cancelHref: string;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login?not-authorized=true");
  }

  if (!session.user.emailVerified) {
    return (
      <div className="flex max-w-[560px] flex-col items-start gap-2 rounded-card border border-line bg-surface p-3">
        <h1 className="text-section font-semibold">Потвърдете имейла си</h1>
        <p className="text-body text-ink-2">
          Преди да публикувате задачи, потвърдете имейл адреса си в профила.
        </p>
        <Link href="/profile" className="btn-gold">
          Към профила
        </Link>
      </div>
    );
  }

  return <TaskForm mode="create" category={category} secondStep={secondStep} cancelHref={cancelHref} />;
}
