import DetailsForm from "@/components/profile/DetailsForm";
import PasswordForm from "@/components/profile/PasswordForm";
import PushSwitch from "@/components/profile/PushSwitch";
import SignOutButton from "@/components/profile/SignOutButton";
import ProfileHeading from "@/components/profile/ProfileHeading";
import ThemeSwitch from "@/components/profile/ThemeSwitch";
import { auth } from "@/lib/auth";
import { deviceTheme } from "@/lib/device-theme";
import { notifications } from "@/lib/notifications";
import { vapidPublicKey } from "@/lib/push";
import { getActorSession } from "@/lib/session";
import { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Avexim Communication | Профил",
};

/**
 * The Profile: the person's picture, name and email, password, this device's notifications and
 * appearance, and signing out. One column on phones; on desktop the
 * account forms sit beside the device settings.
 */
export default async function Profile() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login?not-authorized=true");
  }

  const { user } = session;
  const signedIn = await getActorSession();
  const sessionEndpoints = signedIn
    ? await notifications.sessionEndpoints(signedIn.actor, signedIn.sessionId)
    : [];
  const theme = await deviceTheme();

  return (
    <div className="flex w-full max-w-[1040px] flex-col gap-3 px-2 pt-3 pb-4 lg:gap-4 lg:px-6 lg:pt-1">
      <div className="flex flex-col gap-1">
        <h1 className="screen-title">Профил</h1>
        <ProfileHeading name={user.name} email={user.email} image={user.image ?? null} />
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] lg:items-start lg:gap-4">
        <div className="flex flex-col gap-3 lg:gap-4">
          <Section id="details" title="Лични данни">
            <DetailsForm name={user.name} email={user.email} isVerified={user.emailVerified} />
          </Section>
          <Section id="password" title="Парола">
            <PasswordForm email={user.email} />
          </Section>
        </div>

        <div className="flex flex-col gap-3 lg:gap-4">
          <Section id="notifications" title="Известия">
            <PushSwitch vapidPublicKey={vapidPublicKey()} sessionEndpoints={sessionEndpoints} />
          </Section>
          <Section id="appearance" title="Изглед">
            <ThemeSwitch theme={theme} />
          </Section>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}

/** One part of the Profile: an uppercase heading over a card. */
function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-heading`} className="flex flex-col gap-1">
      <h2 id={`${id}-heading`} className="eyebrow px-1 text-ink-2">
        {title}
      </h2>
      <div className="rounded-card border border-line bg-surface p-2 lg:p-3">{children}</div>
    </section>
  );
}
