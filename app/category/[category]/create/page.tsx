import TaskForm from "@/components/task/TaskForm";
import { auth } from "@/lib/auth";
import { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { isCategory } from "@/lib/categories";

export const metadata: Metadata = {
  title: "Avexim Communication | Добавяне на задача",
};

export default async function CreateTaskPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (!isCategory(category)) {
    notFound();
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login?not-authorized=true");
  } else if (session && !session.user.emailVerified) {
    redirect(`/category/${category}?verify-email=true`);
  }

  return <TaskForm category={category} />;
}
