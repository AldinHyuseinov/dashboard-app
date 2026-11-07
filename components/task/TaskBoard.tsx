"use client";

import TaskCard from "./TaskCard";
import { TaskWithFiles } from "@/lib/types";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Alert from "../notification/Alert";
import Pagination from "../Pagination";

export default function TaskBoard({
  initialTasks,
  category,
  currentUserId,
  currentPage,
  totalPages,
}: {
  initialTasks: TaskWithFiles[];
  category: string;
  currentUserId: string;
  currentPage: number;
  totalPages: number;
}) {
  const router = useRouter();

  return (
    <>
      {/* Changed to a Link for creating a new task */}
      <Link
        href={`/category/${category}/create`}
        className="bg-primary-gold text-on-gold text-center px-12 py-4 mb-4 mx-auto rounded-md font-bold shadow hover:brightness-95 transition cursor-pointer block w-max"
      >
        + Добави
      </Link>

      <Alert />

      <div className="flex flex-col gap-2">
        {initialTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            currentUserId={currentUserId}
            onView={() => {
              // Navigates to the read-only view page
              router.push(`/category/${category}/${task.id}`);
            }}
          />
        ))}
        {initialTasks.length === 0 && (
          <p className="text-gray-500 col-span-full">Няма намерени задачи.</p>
        )}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageHref={(page) => `/category/${category}?page=${page}`}
      />
    </>
  );
}
