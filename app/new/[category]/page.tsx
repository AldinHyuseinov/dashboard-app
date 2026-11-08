import { Metadata } from "next";
import { notFound } from "next/navigation";
import NewTaskScreen from "@/components/task/NewTaskScreen";
import { isCategory } from "@/lib/categories";

export const metadata: Metadata = {
  title: "Avexim Communication | Нова задача",
};

/** New task's second step: the form, for the Category chosen on the first. */
export default async function NewTaskInCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (!isCategory(category)) {
    notFound();
  }

  return (
    <div className="flex w-full max-w-130 flex-col px-2 pt-3 pb-4 lg:px-6 lg:pt-1">
      <NewTaskScreen category={category} secondStep cancelHref="/new" />
    </div>
  );
}
