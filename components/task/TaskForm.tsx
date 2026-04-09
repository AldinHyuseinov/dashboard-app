"use client";

import { submitTaskAction } from "@/actions/task-actions";
import { SelectedFile, TaskFormProps } from "@/lib/types";
import { useEffect, useState, useActionState, useRef } from "react";
import SubmitButton from "../SubmitButton";
import { MAX_FILES } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { ExistingFilePreview, LocalFilePreview } from "./FilePreview";

// Renamed from TaskModal to TaskForm since it's a page now
export default function TaskForm({ category, existingTask }: Omit<TaskFormProps, "onClose">) {
  const router = useRouter(); // Initialize the router
  const [state, formAction] = useActionState(submitTaskAction, {});

  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [deletedFileIds, setDeletedFileIds] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const visibleExistingFiles =
    existingTask?.files?.filter((f) => !deletedFileIds.includes(f.id)) || [];
  const existingFileCount = visibleExistingFiles.length;

  const capacity = MAX_FILES - existingFileCount;
  const isOverLimit = selectedFiles.length > capacity;

  // Navigate back to the category page on success
  useEffect(() => {
    if (state.success) {
      router.push(`/category/${category}`);
    }
  }, [state.success, category, router]);

  useEffect(() => {
    if (state.errors && fileInputRef.current && selectedFiles.length > 0) {
      const dataTransfer = new DataTransfer();
      selectedFiles.forEach((sf) => dataTransfer.items.add(sf.file));
      fileInputRef.current.files = dataTransfer.files;
    }
  }, [state.errors, selectedFiles]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    selectedFiles.forEach((sf) => {
      if (sf.previewUrl) URL.revokeObjectURL(sf.previewUrl);
    });

    const newSelectedFiles = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setSelectedFiles(newSelectedFiles);
  };

  const handleRemoveExistingFile = (id: string) => {
    setDeletedFileIds((prev) => [...prev, id]);
  };

  const handleRemoveNewFile = (indexToRemove: number) => {
    const removedFile = selectedFiles[indexToRemove];
    if (removedFile.previewUrl) {
      URL.revokeObjectURL(removedFile.previewUrl);
    }

    const updatedFiles = selectedFiles.filter((_, index) => index !== indexToRemove);
    setSelectedFiles(updatedFiles);

    if (fileInputRef.current) {
      const dataTransfer = new DataTransfer();
      updatedFiles.forEach((sf) => dataTransfer.items.add(sf.file));
      fileInputRef.current.files = dataTransfer.files;
    }
  };

  return (
    <div className="flex flex-wrap items-start justify-center w-full p-4 gap-1 pt-2">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-30 p-2">
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

          {deletedFileIds.map((id) => (
            <input key={id} type="hidden" name="deletedFileIds" value={id} />
          ))}

          <div>
            <label htmlFor="title" className="block text-sm font-bold text-gray-700 mb-1">
              Заглавие *
            </label>
            <input
              id="title"
              name="title"
              defaultValue={state.inputs?.title ?? existingTask?.title ?? ""}
              className={`w-full border border-gray-300 rounded-md p-1 outline-none transition-colors ${state.errors?.title ? "border-red-500" : "focus:ring-primary-gold focus:border-primary-gold"}`}
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
              defaultValue={state.inputs?.description ?? existingTask?.description ?? ""}
              className={`w-full border border-gray-300 rounded-md p-1 outline-none transition-colors ${state.errors?.description ? "border-red-500" : "focus:ring-primary-gold focus:border-primary-gold"}`}
            />
            {state.errors?.description && (
              <p className="text-xs text-red-500 mt-1">{state.errors.description[0]}</p>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="files" className="text-sm font-bold text-gray-700">
                Прикачени файлове
              </label>
              <span
                className={`text-sm font-bold ${isOverLimit ? "text-red-500" : "text-gray-400"}`}
              >
                {existingFileCount + selectedFiles.length} / {MAX_FILES}
              </span>
            </div>

            {capacity > 0 ? (
              <input
                id="files"
                name="files"
                type="file"
                ref={fileInputRef}
                multiple
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="text-sm text-gray-500 file:mr-4 file:p-1 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-yellow-50 file:text-primary-gold hover:file:bg-yellow-100 cursor-pointer w-full border rounded-md mb-2"
              />
            ) : (
              <div className="p-2 border rounded-md bg-gray-50 text-gray-500 text-xs italic text-center mb-2">
                Лимитът от {MAX_FILES} файла е достигнат.
              </div>
            )}

            {isOverLimit && (
              <p className="text-xs text-red-500 mb-2 font-bold">
                Не можете да добавяте повече от {MAX_FILES} файла.
              </p>
            )}

            {state.errors?.files && (
              <p className="text-xs text-red-500 mt-1">{state.errors.files[0]}</p>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => router.push(`/category/${category}`)} // Navigate back to list instead of onClose
              className="px-1 rounded-md text-gray-600 text-sm hover:bg-gray-100 cursor-pointer font-medium"
            >
              Отказ
            </button>
            <SubmitButton
              pendingText={"Запазване..."}
              defaultText={"Запази"}
              disabled={isOverLimit}
            />
          </div>
        </form>
      </div>

      {/* RIGHT SIDE: Visual Preview Panel */}
      <div
        className={`${visibleExistingFiles.length > 0 || selectedFiles.length > 0 ? "flex flex-col gap-2" : "hidden"} w-full max-w-30`}
      >
        {visibleExistingFiles.length > 0 && (
          <div className="p-1 bg-white rounded-xl shadow-2xl">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Вече запазени
            </h3>
            <div className="flex flex-wrap justify-center gap-1 ">
              {visibleExistingFiles.map((file) => (
                <ExistingFilePreview
                  key={file.id}
                  file={file}
                  onRemove={handleRemoveExistingFile}
                />
              ))}
            </div>
          </div>
        )}

        {selectedFiles.length > 0 && (
          <div className="p-1 bg-white rounded-xl shadow-2xl">
            <h3 className="text-xs font-bold text-primary-gold uppercase tracking-wider mb-2">
              Нови за качване
            </h3>
            <div className="flex flex-wrap justify-center gap-1 bg-yellow-50 rounded-md p-0.5">
              {selectedFiles.map((sf, i) => (
                <LocalFilePreview
                  key={i}
                  file={sf.file}
                  previewUrl={sf.previewUrl}
                  onRemove={() => handleRemoveNewFile(i)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
