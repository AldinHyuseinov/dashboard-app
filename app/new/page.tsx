import CategoryList from "@/components/categories/CategoryList";
import { getActor } from "@/lib/session";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Avexim Communication | Нова задача",
};

/** New task, started from anywhere: the Category comes first. */
export default async function NewTaskPage() {
  const actor = await getActor();
  if (!actor) {
    redirect("/login?not-authorized=true");
  }

  return (
    <div className="flex w-full max-w-[640px] flex-col gap-3 px-2 pt-3 pb-4 lg:px-6 lg:pt-1">
      <div className="flex flex-col gap-0.5">
        <p className="eyebrow text-ink-2">Нова задача</p>
        <h1 className="screen-title">В коя категория?</h1>
      </div>
      <CategoryList hrefFor={(slug) => `/category/${slug}/create`} />
    </div>
  );
}
