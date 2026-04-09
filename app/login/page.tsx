import LoginForm from "@/components/forms/LoginForm";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <div className="p-1 mt-2 max-w-md mx-auto">
      <Suspense fallback={<LoadingSpinner />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
