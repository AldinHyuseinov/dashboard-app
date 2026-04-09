import ProfileForm from "@/components/ProfileForm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function Profile() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login?not-authorized=true");
  }

  return <ProfileForm name={session.user.name} email={session.user.email} />;
}
