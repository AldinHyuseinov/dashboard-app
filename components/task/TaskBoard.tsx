"use client";

import { useState } from "react";
import TaskModal from "./TaskModal";
import TaskCard from "./TaskCard";
import { TaskWithFiles } from "@/lib/types";

export default function TaskBoard({
  initialTasks,
  category,
  currentUserId,
}: {
  initialTasks: TaskWithFiles[];
  category: string;
  currentUserId: string;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskWithFiles | undefined>(undefined);

  const openNewModal = () => {
    setTaskToEdit(undefined);
    setIsModalOpen(true);
  };

  return (
    <>
      <button
        onClick={openNewModal}
        className="bg-primary-gold text-white px-6 py-2 mb-2 mx-auto rounded-md font-bold shadow hover:bg-secondary-gold-dark transition cursor-pointer"
      >
        + Нова Задача
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {initialTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            category={category}
            currentUserId={currentUserId}
            onEdit={() => {
              setTaskToEdit(task);
              setIsModalOpen(true);
            }}
          />
        ))}
        {initialTasks.length === 0 && (
          <p className="text-gray-500 col-span-full">Няма намерени задачи.</p>
        )}
      </div>

      {isModalOpen && (
        <TaskModal
          onClose={() => setIsModalOpen(false)}
          category={category}
          existingTask={taskToEdit}
        />
      )}
    </>
  );
}
