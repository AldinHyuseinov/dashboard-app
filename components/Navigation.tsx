import { navLinks } from "@/lib/types";
import Link from "next/link";

export default function Navigation() {
  return (
    <nav className="border border-gray-400 rounded-full p-1 mt-2 bg-white flex flex-wrap justify-center items-center gap-2 shadow-sm md:gap-1">
      {navLinks.map((link) => (
        // 2. Add "group" class to the wrapper to trigger the hover effect
        <div key={link.label} className="relative group">
          <Link
            href={"/category" + link.href}
            className="bg-primary-gold text-white p-1 rounded-full font-bold text-sm tracking-wider hover:bg-secondary-gold-dark transition-colors shadow-sm cursor-pointer"
          >
            {link.label}
          </Link>

          {link.dropdown && (
            <div className="absolute left-0 top-full pt-1 hidden group-hover:block max-w-30 min-w-20 z-50">
              <div className="bg-[#D8AB44] shadow-xl flex flex-col p-1 rounded-2xl">
                {link.dropdown.map((item, idx) => (
                  <Link
                    key={idx}
                    href={"/category" + item.href}
                    className="block text-tertiary-brown font-bold text-sm p-1 border-b border-white/20 last:border-0 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}
