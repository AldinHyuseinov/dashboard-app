import { Prisma } from "@/generated/prisma/client";
import z from "zod";

export const loginSchema = z.object({
  email: z.email("Невалиден имейл адрес."),
  password: z.string().min(1, "Паролата е задължителна."),
});

export const taskSchema = z.object({
  title: z.string().min(1, "Заглавието е задължително."),
  description: z.string().min(1, "Описанието е задължително."),
  category: z.string().min(1),
});

export type LoginState = {
  errors?: {
    email?: string[];
    password?: string[];
    form?: string;
  };
  success?: boolean;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  isDone: boolean;
  userId: string;
};

export type TaskFileMeta = {
  id: string;
  fileName: string;
  fileType: string;
};

// Extend the Prisma Task type to include our file metadata
export type TaskWithFiles = Task & {
  files: TaskFileMeta[];
};

export type TaskCardProps = {
  task: TaskWithFiles;
  category: string;
  currentUserId: string;
  onEdit: () => void;
};

export type TaskModalProps = {
  onClose: () => void;
  category: string;
  existingTask?: {
    id: string;
    title: string;
    description: string;
    files: TaskFileMeta[];
  };
};

export const navLinks = [
  {
    label: "Обекти",
    href: "/venues",
    dropdown: [
      { label: "Голф Клубове", href: "/golf-clubs" },
      { label: "Барове", href: "/bars" },
      { label: "Хотели", href: "/hotels" },
      { label: "Кетъринг", href: "/catering" },
      { label: "Парти центрове", href: "/party-centers" },
      { label: "Премиум магазини за алкохол", href: "/premium-liquor-stores" },
    ],
  },
  { label: "Събития", href: "/events" },
  { label: "Коктейли", href: "/cocktails" },
  { label: "Социални мрежи", href: "/social-media" },
  { label: "Ресурси", href: "/resources" },
  { label: "Склад", href: "/warehouse" },
];

export type TaskFormState = {
  errors?: {
    title?: string[];
    description?: string[];
    files?: string[];
    form?: string;
  };
  success?: boolean;
};

export type ProcessFilesResult = {
  errors?: { files: string[] };
  processedFiles?: Prisma.TaskFileCreateWithoutTaskInput[];
};
