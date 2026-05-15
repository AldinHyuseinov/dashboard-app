import LoginForm from "@/components/forms/LoginForm";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Avexim Communication | Вход",
};

export default function LoginPage() {
  return (
    <div className="p-1 mt-2 max-w-md mx-auto">
      <Suspense fallback={<LoadingSpinner />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
