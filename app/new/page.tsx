import CategoryList from "@/components/categories/CategoryList";
import NewTaskScreen from "@/components/task/NewTaskScreen";
import { getActor } from "@/lib/session";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Avexim Communication | Нова задача",
};

/**
 * New task, started from anywhere. The Category comes first: on phones it's
 * a step of its own, on desktop it sits beside the form. Venues is never offered.
 */
export default async function NewTaskPage() {
  const actor = await getActor();
  if (!actor) {
    redirect("/login?not-authorized=true");
  }

  return (
    <div className="flex w-full max-w-130 flex-col gap-3 px-2 pt-3 pb-4 lg:px-6 lg:pt-1">
      <div className="flex flex-col gap-3 lg:hidden">
        <div className="flex flex-col gap-0.5">
          <p className="eyebrow text-ink-2">Стъпка 1 от 2</p>
          <h1 className="screen-title">В коя категория?</h1>
        </div>
        <CategoryList hrefFor={(slug) => `/new/${slug}`} />
      </div>
      <div className="hidden lg:block">
        <NewTaskScreen secondStep={false} cancelHref="/" />
      </div>
    </div>
  );
}
