import { signOutAction } from "@/actions/auth-actions";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";

export default async function Header() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <header className="bg-primary-gold w-full text-white px-6 py-1 flex items-center justify-between border-2 border-secondary-gold-dark md:flex-row flex-col gap-1 text-center">
      <div className="flex-1">
        <Link href="/" className="italic font-bold tracking-wide text-lg">
          Комуникационна платформа
        </Link>
      </div>
      <div className="flex-1 flex justify-center items-center gap-2">
        <Link href="/">
          <Image src="/company-logo.png" alt="Logo" width={300} height={70} />
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-end gap-1">
        {session ? (
          <>
            <Link href="/profile">
              <span className="font-bold text-sm">Здравей, {session.user.name}!</span>
            </Link>
            <form action={signOutAction}>
              <button type="submit" className="btn-header">
                Излез
              </button>
            </form>
          </>
        ) : (
          <Link href="/login" className="btn-header">
            Впиши се
          </Link>
        )}
      </div>
    </header>
  );
}
