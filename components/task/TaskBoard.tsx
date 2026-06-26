"use client";

import TaskCard from "./TaskCard";
import { TaskWithFiles } from "@/lib/types";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Alert from "../notification/Alert";

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
        className="bg-primary-gold text-white text-center px-6 py-2 mb-2 mx-auto rounded-md font-bold shadow hover:bg-secondary-gold-dark transition cursor-pointer block w-max"
      >
        + Добави
      </Link>

      <Alert />

      <div className="flex flex-col gap-1">
        {initialTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            category={category}
            currentUserId={currentUserId}
            onEdit={() => {
              // Navigate to the edit page for this specific task
              router.push(`/category/${category}/${task.id}/edit`);
            }}
          />
        ))}
        {initialTasks.length === 0 && (
          <p className="text-gray-500 col-span-full">Няма намерени задачи.</p>
        )}
      </div>

      {/* --- 2. ADDED: Pagination Navigation Bar --- */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-1 mb-1 pt-1 border-t border-gray-100">
          {/* Previous Page Link */}
          <Link
            href={`/category/${category}?page=${currentPage - 1}`}
            className={`px-2 py-1.5 border rounded-md text-xs font-bold transition-all ${
              currentPage <= 1
                ? "pointer-events-none opacity-40 border-gray-200 text-gray-400"
                : "border-gray-300 text-gray-700 bg-white hover:bg-gray-100 hover:border-primary-gold"
            }`}
          >
            ◄
          </Link>

          {/* Page Indicator */}
          <span className="text-xs font-bold text-gray-500 tracking-wider">
            Страница {currentPage} от {totalPages}
          </span>

          {/* Next Page Link */}
          <Link
            href={`/category/${category}?page=${currentPage + 1}`}
            className={`px-2 py-1.5 border rounded-md text-xs font-bold transition-all ${
              currentPage >= totalPages
                ? "pointer-events-none opacity-40 border-gray-200 text-gray-400"
                : "border-gray-300 text-gray-700 bg-white hover:bg-gray-100 hover:border-primary-gold"
            }`}
          >
            ►
          </Link>
        </div>
      )}
    </>
  );
}
