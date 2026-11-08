import { Prisma } from "@/generated/prisma/client";
import { ReactNode } from "react";
import z from "zod";
import { passwordProblems } from "./password-rules";

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
      for (const problem of passwordProblems(data.newPassword)) {
        ctx.addIssue({ code: "custom", message: problem, path: ["newPassword"] });
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

export type CommentReaction = {
  id: string;
  emoji: string;
  userId: string;
  user: { name: string | null };
};

export type Comment = {
  id: string;
  text: string;
  createdAt: Date;
  editedAt?: Date | null;
  isPinned?: boolean;
  userId: string;
  user: { name: string | null };
  parentId?: string | null;
  /** The Comment a Reply answers: its top-level Comment or another Reply in the thread. */
  answersId?: string | null;
  reactions?: CommentReaction[];
};

export type CommentThreadData = {
  topLevel: Comment;
  replies: Comment[];
};

export type SortMode = "top" | "newest";

export type TaskFormState = {
  errors?: {
    title?: string[];
    description?: string[];
    files?: string[];
    form?: string;
  };
  /** The Task just published, for the form to say so and link to it. */
  published?: { href: string; title: string };
};

export type ProfileFormState = {
  /** The new address a code was sent to; the change waits for that code. */
  pendingEmail?: string;
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

export type AlertBannerProps = {
  type?: "warning" | "success" | "error";
  children: ReactNode;
  onClose?: () => void;
};
