import CategoryList from "@/components/categories/CategoryList";
import { getActor } from "@/lib/session";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Avexim Communication | Категории",
};

/** Every Category, to open its Task list. */
export default async function CategoriesPage() {
  const actor = await getActor();
  if (!actor) {
    redirect("/login?not-authorized=true");
  }

  return (
    <div className="flex w-full max-w-[640px] flex-col gap-3 px-2 pt-3 pb-4 lg:px-6 lg:pt-1">
      <h1 className="screen-title">Категории</h1>
      <CategoryList hrefFor={(slug) => `/category/${slug}`} />
    </div>
  );
}
