"use client";

import TaskCard from "./TaskCard";
import { TaskWithFiles } from "@/lib/types";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function TaskBoard({
  initialTasks,
  category,
  currentUserId,
}: {
  initialTasks: TaskWithFiles[];
  category: string;
  currentUserId: string;
}) {
  const router = useRouter();

  return (
    <>
      {/* Changed to a Link for creating a new task */}
      <Link
        href={`/category/${category}/create`}
        className="bg-primary-gold text-white text-center px-6 py-2 mb-2 mx-auto rounded-md font-bold shadow hover:bg-secondary-gold-dark transition cursor-pointer block w-max"
      >
        + Нова Задача
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 lg:grid-cols-3 items-start">
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
    </>
  );
}
