import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import TaskBoard from "@/components/task/TaskBoard";
import { getCategoryLabel } from "@/lib/categories";
import { Metadata } from "next";
import { ITEMS_PER_PAGE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Avexim Communication | Задачи",
};

export default async function Tasks(props: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  const { category } = params;

  const currentPage = Number(searchParams.page) || 1;
  const skip = (currentPage - 1) * ITEMS_PER_PAGE;

  const categoryLabel = getCategoryLabel(category);
  if (categoryLabel === undefined) {
    notFound();
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login?not-authorized=true");
  }

  const [tasks, totalTasks] = await prisma.$transaction([
    prisma.task.findMany({
      where: { category },
      orderBy: { updatedAt: "desc" },
      skip, // Skip previous pages
      take: ITEMS_PER_PAGE,
      include: {
        files: {
          select: { id: true, fileName: true, fileType: true },
        },
        user: {
          select: { name: true },
        },
      },
    }),
    prisma.task.count({ where: { category } }),
  ]);

  const totalPages = Math.ceil(totalTasks / ITEMS_PER_PAGE);

  return (
    <div className="max-w-6xl mx-auto mt-2 px-2 flex flex-col">
      <div className="flex justify-center items-center mb-2 border-b border-primary-gold p-1">
        <h1 className="text-3xl font-bold text-tertiary-brown text-center">{categoryLabel}</h1>
      </div>

      <TaskBoard
        initialTasks={tasks}
        category={category}
        currentUserId={session.user.id}
        currentPage={currentPage}
        totalPages={totalPages}
      />
    </div>
  );
}
