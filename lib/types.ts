import { Prisma } from "@/generated/prisma/client";
import { ReactNode } from "react";
import z from "zod";

export const loginSchema = z.object({
  email: z.email("Невалиден имейл адрес."),
  password: z.string().min(1, "Паролата е задължителна."),
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

export type ProcessFilesResult = {
  errors?: { files: string[] };
  processedFiles?: Prisma.TaskFileCreateWithoutTaskInput[];
};

export type AlertBannerProps = {
  type?: "warning" | "success" | "error";
  children: ReactNode;
  onClose?: () => void;
};
