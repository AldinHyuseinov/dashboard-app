import TaskForm from "@/components/task/TaskForm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function CreateTaskPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login?not-authorized=true");
  }

  return <TaskForm category={category} />;
}
