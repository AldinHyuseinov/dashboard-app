import ForgotPasswordForm from "@/components/forms/ForgotPasswordForm";
import BrandPanel from "@/components/shell/BrandPanel";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Avexim Communication | Забравена парола",
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <BrandPanel />
      <div className="safe-x flex flex-1 justify-center pt-4 pb-8 lg:items-center lg:py-8">
        <div className="flex w-full max-w-[400px] flex-col gap-4">
          <div className="flex flex-col gap-0.5">
            <h1 className="screen-title">Забравена парола</h1>
            <p className="text-secondary text-ink-2">
              Въведете имейла на служебния си профил и ще ви изпратим код за нова парола.
            </p>
          </div>
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
