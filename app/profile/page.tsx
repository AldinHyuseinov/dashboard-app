import { signOutAction } from "@/actions/auth-actions";
import ProfileForm from "@/components/forms/ProfileForm";
import { auth } from "@/lib/auth";
import { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Avexim Communication | Профил",
};

export default async function Profile() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login?not-authorized=true");
  }

  return (
    <>
      <ProfileForm
        name={session.user.name}
        email={session.user.email}
        isVerified={session.user.emailVerified}
      />
      <form action={signOutAction} className="w-full px-8 pb-4 sm:max-w-md sm:px-0">
        <button type="submit" className="btn-ghost w-full">
          Излез
        </button>
      </form>
    </>
  );
}
