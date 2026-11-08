import LoginForm from "@/components/forms/LoginForm";
import BrandPanel from "@/components/shell/BrandPanel";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Avexim Communication | Вход",
};

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <BrandPanel />
      <div className="safe-x flex flex-1 justify-center pt-4 pb-8 lg:items-center lg:py-8">
        <div className="flex w-full max-w-50 flex-col gap-4">
          <div className="flex flex-col gap-0.5">
            <h1 className="screen-title">Вход</h1>
            <p className="text-secondary text-ink-2">
              Впишете се с имейла и паролата на служебния си профил.
            </p>
          </div>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
