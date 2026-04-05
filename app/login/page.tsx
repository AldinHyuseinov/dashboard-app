"use client";

import { useActionState } from "react";
import { loginAction } from "@/actions/auth-actions";
import SubmitButton from "@/components/SubmitButton";

export default function LoginPage() {
  const [state, formAction] = useActionState(loginAction, {});

  return (
    <div className="p-1 mt-2 bg-white shadow-2xl rounded-xl border border-gray-200">
      {state?.errors?.form && (
        <div className="w-full p-1.5 bg-red-50 border border-red-200 text-red-600 text-sm rounded-md text-center">
          {state.errors.form}
        </div>
      )}

      <form action={formAction} className="p-1 flex flex-col gap-1">
        {/* Email Field */}
        <div className="p-1">
          <label className="block text-sm font-bold text-gray-700 mb-1" htmlFor="email">
            Имейл
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="Напиши имейл"
            className={`w-full p-1 rounded-md border bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:bg-white transition-all ${
              state?.errors?.email
                ? "border-red-500 focus:ring-red-200"
                : "border-gray-300 focus:ring-secondary-gold-dark focus:border-primary-gold"
            }`}
          />
          {/* Zod Email Error */}
          {state?.errors?.email && (
            <p className="mt-1 text-xs text-red-500">{state.errors.email[0]}</p>
          )}
        </div>

        {/* Password Field */}
        <div className="p-1">
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-bold text-gray-700" htmlFor="password">
              Парола
            </label>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            className={`w-full p-1 rounded-md border bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:bg-white transition-all ${
              state?.errors?.password
                ? "border-red-500 focus:ring-red-200"
                : "border-gray-300 focus:ring-secondary-gold-dark focus:border-primary-gold"
            }`}
          />
          {/* Zod Password Error */}
          {state?.errors?.password && (
            <p className="mt-1 text-xs text-red-500">{state.errors.password[0]}</p>
          )}
        </div>
        <SubmitButton />
      </form>
    </div>
  );
}
