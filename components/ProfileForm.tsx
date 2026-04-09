"use client";

import { useEffect, useActionState } from "react";
import { useRouter } from "next/navigation";
import { updateProfileAction } from "@/actions/user-actions";
import SubmitButton from "@/components/SubmitButton";

export default function ProfileForm({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [state, formAction] = useActionState(updateProfileAction, {});

  // Navigate away automatically if the server action is successful
  useEffect(() => {
    if (state.success) {
      router.push("/"); // Redirects to home page on success
    }
  }, [state.success, router]);

  return (
    <div className="flex justify-center items-start my-2 px-4 w-full">
      <div className="w-full sm:max-w-md bg-white rounded-xl shadow-2xl border border-gray-200 p-2">
        <form action={formAction} className="flex flex-col gap-1">
          <div className="border-b border-gray-100 mb-2">
            <h1 className="text-xl font-bold text-tertiary-brown">Редакция на профила</h1>
            <p className="text-sm text-gray-500 my-1">
              Направи промени на своя профил. Натисни запази, когато приключиш.
            </p>
          </div>

          {state.errors?.form && (
            <div className="p-2 bg-red-100 text-red-600 rounded-md text-xs font-medium mb-1">
              {state.errors.form}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <div className="flex flex-col gap-1">
              <label htmlFor="name" className="text-sm font-bold text-gray-700">
                Име
              </label>
              <input
                id="name"
                name="name"
                defaultValue={name}
                className={`w-full border rounded-md p-1 outline-none transition-colors ${state.errors?.name ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-1 focus:ring-primary-gold focus:border-primary-gold"}`}
              />
              {state.errors?.name && <p className="text-xs text-red-500">{state.errors.name[0]}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="text-sm font-bold text-gray-700">
                Имейл
              </label>
              <input
                id="email"
                name="email"
                type="email"
                defaultValue={email}
                className={`w-full border rounded-md p-1 outline-none transition-colors ${state.errors?.email ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-1 focus:ring-primary-gold focus:border-primary-gold"}`}
              />
              {state.errors?.email && (
                <p className="text-xs text-red-500">{state.errors.email[0]}</p>
              )}
            </div>

            {/* --- Password Section Divider --- */}
            <div className="p-1 border-t border-gray-100 mt-2 text-center">
              <span className="text-xs font-bold text-primary-gold uppercase tracking-wider">
                Смяна на парола
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="oldPassword" className="text-sm font-bold text-gray-700">
                Стара парола
              </label>
              <input
                id="oldPassword"
                name="oldPassword"
                type="password"
                placeholder="••••••••"
                className={`w-full border rounded-md p-1 outline-none transition-colors ${state.errors?.oldPassword ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-1 focus:ring-primary-gold focus:border-primary-gold"}`}
              />
              {state.errors?.oldPassword && (
                <p className="text-xs text-red-500">{state.errors.oldPassword[0]}</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="newPassword" className="text-sm font-bold text-gray-700">
                Нова парола
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                placeholder="••••••••"
                className={`w-full border rounded-md p-1 outline-none transition-colors ${state.errors?.newPassword ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-1 focus:ring-primary-gold focus:border-primary-gold"}`}
              />
              {state.errors?.newPassword && (
                <p className="text-xs text-red-500">{state.errors.newPassword[0]}</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="confirmPassword" className="text-sm font-bold text-gray-700">
                Потвърди нова парола
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                className={`w-full border rounded-md p-1 outline-none transition-colors ${state.errors?.confirmPassword ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-1 focus:ring-primary-gold focus:border-primary-gold"}`}
              />
              {state.errors?.confirmPassword && (
                <p className="text-xs text-red-500">{state.errors.confirmPassword[0]}</p>
              )}
            </div>
          </div>

          <div className="mt-2 p-1 border-t border-gray-100 flex justify-end gap-1">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-2 py-1 text-sm font-medium text-gray-600 bg-white hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
            >
              Отказ
            </button>
            <SubmitButton pendingText={"Запазване..."} defaultText={"Запази"} />
          </div>
        </form>
      </div>
    </div>
  );
}
