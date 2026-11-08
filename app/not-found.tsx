import BrandPanel from "@/components/shell/BrandPanel";
import { getActor } from "@/lib/session";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Avexim Communication | 404",
};

/** Not found: inside the shell when signed in, beside the brand panel when not. */
export default async function NotFound() {
  const actor = await getActor();

  const content = (
    <div className="flex w-full max-w-70 flex-col items-start gap-3 px-2 pt-4 pb-8 lg:px-6">
      <div className="flex flex-col gap-0.5">
        <p className="eyebrow text-gold-ink">Грешка 404</p>
        <h1 className="screen-title">Страницата не е намерена</h1>
      </div>
      <p className="text-body text-ink-2">
        Връзката може да е грешна или остаряла, или задачата вече да е изтрита.
      </p>
      {actor ? (
        <Link href="/" className="btn-gold">
          Към активността
        </Link>
      ) : (
        <Link href="/login" className="btn-gold">
          Към входа
        </Link>
      )}
    </div>
  );

  if (actor) return content;

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <BrandPanel />
      <div className="safe-x flex flex-1 justify-center lg:items-center">{content}</div>
    </div>
  );
}
