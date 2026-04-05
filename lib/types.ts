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
