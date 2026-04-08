import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import TaskBoard from "@/components/task/TaskBoard";
import { navLinks } from "@/lib/types";

export default async function Tasks(props: { params: Promise<{ category: string }> }) {
  const params = await props.params;
  const { category } = params;

  if (
    !navLinks.some(
      (link) =>
        link.href === `/${category}` || link.dropdown?.some((item) => item.href === `/${category}`),
    )
  ) {
    notFound();
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login?not-authorized=true");
  }

  const tasks = await prisma.task.findMany({
    where: { category },
    orderBy: { createdAt: "desc" },
    include: {
      files: {
        select: { id: true, fileName: true, fileType: true },
      },
      user: {
        select: { name: true },
      },
    },
  });

  // Get label from navLinks
  let categoryLabel = "Задачи";
  const navLink = navLinks.find((link) => link.href === `/${category}`);
  if (navLink) {
    categoryLabel = navLink.label;
  } else {
    // Check dropdown items
    for (const link of navLinks) {
      const dropdownItem = link.dropdown?.find((item) => item.href === `/${category}`);
      if (dropdownItem) {
        categoryLabel = dropdownItem.label;
        break;
      }
    }
  }

  return (
    <div className="max-w-6xl mx-auto mt-2 px-4 flex flex-col">
      <div className="flex justify-center items-center mb-2 border-b border-primary-gold p-1">
        <h1 className="text-3xl font-bold text-tertiary-brown text-center">{categoryLabel}</h1>
      </div>

      <TaskBoard initialTasks={tasks} category={category} currentUserId={session.user.id} />
    </div>
  );
}
