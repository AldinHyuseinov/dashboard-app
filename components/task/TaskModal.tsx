"use client";

import { submitTaskAction } from "@/actions/task-actions";
import { TaskModalProps } from "@/lib/types";
import { useEffect, useState, useActionState } from "react";
import SubmitButton from "../SubmitButton";
import { MAX_FILES } from "@/lib/constants";

export default function TaskModal({ onClose, category, existingTask }: TaskModalProps) {
  const [state, formAction] = useActionState(submitTaskAction, {});
  // Local state just to show UX warnings before submitting
  const [selectedFileCount, setSelectedFileCount] = useState(0);

  const existingFileCount = existingTask?.files?.length || 0;
  const [capacity, setCapacity] = useState(MAX_FILES - existingFileCount);

  // Close the modal automatically if the server action succeeds
  useEffect(() => {
    if (state.success) {
      onClose();
    }
  }, [state.success, onClose]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFileCount(e.target.files?.length || 0);
    setCapacity(capacity - selectedFileCount);
  };

  const isOverLimit = selectedFileCount > capacity;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-30 p-2 relative">
        <h2 className="text-xl font-bold mb-1 text-tertiary-brown">
          {existingTask ? "Редактиране" : "Създаване на задача"}
        </h2>

        {state.errors?.form && (
          <div className="mb-4 p-2 bg-red-100 text-red-600 rounded-md text-sm">
            {state.errors.form}
          </div>
        )}

        <form action={formAction} className="flex flex-col gap-1">
          <input type="hidden" name="category" value={category} />
          {existingTask && <input type="hidden" name="taskId" value={existingTask.id} />}

          <div>
            <label htmlFor="title" className="block text-sm font-bold text-gray-700 mb-1">
              Заглавие *
            </label>
            <input
              id="title"
              name="title"
              defaultValue={existingTask?.title}
              className={`w-full border rounded-md p-1 outline-none transition-colors ${
                state.errors?.title
                  ? "border-red-500"
                  : "focus:ring-primary-gold focus:border-primary-gold"
              }`}
            />
            {state.errors?.title && (
              <p className="text-xs text-red-500 mt-1">{state.errors.title[0]}</p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-bold text-gray-700 mb-1">
              Описание *
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              defaultValue={existingTask?.description}
              className={`w-full border rounded-md p-1 outline-none transition-colors ${
                state.errors?.description
                  ? "border-red-500"
                  : "focus:ring-primary-gold focus:border-primary-gold"
              }`}
            />
            {state.errors?.description && (
              <p className="text-xs text-red-500 mt-1">{state.errors.description[0]}</p>
            )}
          </div>

          {/* File Upload Section */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-bold text-gray-700">Прикачени файлове</label>
              {/* Counter shows current total / limit */}
              <span
                className={`text-[10px] font-bold ${isOverLimit ? "text-red-500" : "text-gray-400"}`}
              >
                {existingFileCount + selectedFileCount} / {MAX_FILES}
              </span>
            </div>

            {/* ONLY hide input if the DB is already full (capacity is 0) */}
            {capacity > 0 ? (
              <>
                <input
                  id="files"
                  name="files"
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="text-sm text-gray-500 file:mr-4 file:p-2 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-yellow-50 file:text-primary-gold hover:file:bg-yellow-100 cursor-pointer w-full border p-1 rounded-md"
                />

                {isOverLimit && (
                  <p className="text-xs text-red-500 mt-1 font-bold">
                    ⚠️ Можете да добавите само още {capacity} файла.
                  </p>
                )}
              </>
            ) : (
              <div className="p-2 border rounded-md bg-gray-50 text-gray-500 text-xs italic text-center">
                Лимитът от {MAX_FILES} файла е достигнат.
              </div>
            )}

            {state.errors?.files && (
              <p className="text-xs text-red-500 mt-1">{state.errors.files[0]}</p>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-1 rounded-md text-gray-600 text-sm hover:bg-gray-100 cursor-pointer font-medium"
            >
              Отказ
            </button>
            <SubmitButton
              pendingText={"Запазване..."}
              defaultText={"Запази"}
              // Disable if user tries to upload 6 when they only have 5 slots
              disabled={isOverLimit}
            />
          </div>
        </form>
      </div>
    </div>
  );
}
