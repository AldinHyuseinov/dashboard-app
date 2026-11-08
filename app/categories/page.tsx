import CategoryList from "@/components/categories/CategoryList";
import { getActor } from "@/lib/session";
import { tasks } from "@/lib/tasks";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Avexim Communication | Категории",
};

/** Every Category, with how many of its Tasks aren't Done, to open its Task list. */
export default async function CategoriesPage() {
  const actor = await getActor();
  if (!actor) {
    redirect("/login?not-authorized=true");
  }

  const notDoneCounts = await tasks.notDoneCounts(actor);

  return (
    <div className="flex w-full max-w-80 flex-col gap-3 px-2 pt-3 pb-4 lg:px-6 lg:pt-1">
      <div className="flex flex-col gap-0.5">
        <h1 className="screen-title">Категории</h1>
        <p className="text-meta text-ink-2">Числото показва неготовите задачи.</p>
      </div>
      <CategoryList hrefFor={(slug) => `/category/${slug}`} notDoneCounts={notDoneCounts} />
    </div>
  );
}
