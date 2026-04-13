import { Prisma } from "@/generated/prisma/client";
import { ReactNode } from "react";
import z from "zod";

export const loginSchema = z.object({
  email: z.email("Невалиден имейл адрес."),
  password: z.string().min(1, "Паролата е задължителна."),
});

export const profileUpdateSchema = z
  .object({
    name: z
      .string("Името е задължително")
      .min(2, "Името трябва да бъде поне 2 символа")
      .max(30, "Името трябва да бъде по-малко от 30 символа")
      .optional(),
    email: z.email("Невалиден имейл адрес").optional(),
    oldPassword: z.string().optional().or(z.literal("")),
    newPassword: z.string().optional().or(z.literal("")),
    confirmPassword: z.string().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    // Only run password validations if the user is trying to change it
    if (data.newPassword) {
      if (!data.oldPassword) {
        ctx.addIssue({
          code: "custom",
          message: "Въведете старата си парола",
          path: ["oldPassword"],
        });
      }
      if (data.newPassword.length < 8) {
        ctx.addIssue({
          code: "custom",
          message: "Паролата трябва да бъде поне 8 символа",
          path: ["newPassword"],
        });
      }
      if (data.newPassword.length > 20) {
        ctx.addIssue({
          code: "custom",
          message: "Паролата трябва да бъде по-малко от 20 символа",
          path: ["newPassword"],
        });
      }
      if (!/[A-Z]/.test(data.newPassword)) {
        ctx.addIssue({
          code: "custom",
          message: "Трябва да съдържа поне една главна буква",
          path: ["newPassword"],
        });
      }
      if (!/[a-z]/.test(data.newPassword)) {
        ctx.addIssue({
          code: "custom",
          message: "Трябва да съдържа поне една малка буква",
          path: ["newPassword"],
        });
      }
      if (!/[0-9]/.test(data.newPassword)) {
        ctx.addIssue({
          code: "custom",
          message: "Трябва да съдържа поне едно число",
          path: ["newPassword"],
        });
      }
      if (!/[!@#$%^&*]/.test(data.newPassword)) {
        ctx.addIssue({
          code: "custom",
          message: "Трябва да съдържа специален символ (!@#$%^&*)",
          path: ["newPassword"],
        });
      }
      if (data.newPassword !== data.confirmPassword) {
        ctx.addIssue({
          code: "custom",
          message: "Паролите не съвпадат",
          path: ["confirmPassword"],
        });
      }
    } else if (data.oldPassword) {
      ctx.addIssue({
        code: "custom",
        message: "Въведете нова парола",
        path: ["newPassword"],
      });
    }
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
  createdAt: Date;
  updatedAt: Date;
};

export type TaskFileMeta = {
  id: string;
  fileName: string;
  fileType: string;
};

export type TaskWithFiles = Task & {
  files: TaskFileMeta[];
  user: { name: string };
};

export type TaskCardProps = {
  task: TaskWithFiles;
  category: string;
  currentUserId: string;
  onEdit: () => void;
};

export type TaskFormProps = {
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

  inputs?: {
    title: string;
    description: string;
  };
  success?: boolean;
};

export type ProfileFormState = {
  errors?: {
    name?: string[];
    email?: string[];
    oldPassword?: string[];
    newPassword?: string[];
    confirmPassword?: string[];
    form?: string;
  };
  success?: boolean;
};

export type ProcessFilesResult = {
  errors?: { files: string[] };
  processedFiles?: Prisma.TaskFileCreateWithoutTaskInput[];
};

export type FileMeta = {
  id: string;
  fileName: string;
  fileType: string;
};

export type SelectedFile = {
  file: File;
  previewUrl: string | null;
};

export type AlertBannerProps = {
  type?: "warning" | "success" | "error";
  children: ReactNode;
  onClose?: () => void;
};
