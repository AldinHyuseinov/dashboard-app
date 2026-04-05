import Image from "next/image";
import Link from "next/link";

export default function Header() {
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

      <div className="flex-1"></div>
    </header>
  );
}
