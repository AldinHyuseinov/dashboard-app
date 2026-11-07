"use client";

import { listCategoryTree } from "@/lib/categories";
import Link from "next/link";
import { useState } from "react";

const categoryHref = (slug: string) => `/category/${slug}`;

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const tree = listCategoryTree();

  const closeAll = () => {
    setIsMobileMenuOpen(false);
    setOpenAccordion(null);
  };

  return (
    <div className="relative w-full flex flex-col items-center z-50">
      {/* --- MOBILE TOGGLE BUTTON --- */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden mt-2 bg-primary-gold text-white p-1.5 px-6 rounded-full font-bold text-sm tracking-wider shadow-sm border border-gray-400 hover:bg-secondary-gold-dark transition-colors active:scale-95"
      >
        {isMobileMenuOpen ? "✕ ЗАТВОРИ" : "☰ МЕНЮ"}
      </button>

      {/* --- DESKTOP NAV --- */}
      <nav className="hidden md:flex border border-gray-400 rounded-full p-1 mt-2 bg-white flex-wrap justify-center items-center gap-2 shadow-sm">
        {tree.map((item) =>
          item.kind === "group" ? (
            // A Category Group is a heading, not a link: it has no page of its own.
            <div key={item.label} className="relative group">
              <button
                type="button"
                aria-haspopup="true"
                className="bg-primary-gold text-white p-1 px-4 rounded-full font-bold text-sm tracking-wider group-hover:bg-secondary-gold-dark group-focus-within:bg-secondary-gold-dark transition-colors shadow-sm cursor-default"
              >
                {item.label}
              </button>

              <div className="absolute left-0 top-full pt-1 hidden group-hover:block group-focus-within:block min-w-40 z-50">
                <div className="bg-[#D8AB44] shadow-xl flex flex-col p-1 rounded-2xl">
                  {item.categories.map((category) => (
                    <Link
                      key={category.slug}
                      href={categoryHref(category.slug)}
                      className="block text-tertiary-brown font-bold text-sm p-2 border-b border-white/20 last:border-0 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      {category.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <Link
              key={item.slug}
              href={categoryHref(item.slug)}
              className="bg-primary-gold text-white p-1 px-4 rounded-full font-bold text-sm tracking-wider hover:bg-secondary-gold-dark transition-colors shadow-sm cursor-pointer"
            >
              {item.label}
            </Link>
          ),
        )}
      </nav>

      {/* --- MOBILE MENU (Animated Dropdown) --- */}
      <div
        className={`
          md:hidden absolute top-full mt-2 w-[95%] max-w-sm bg-white border border-gray-400 rounded-2xl shadow-2xl p-1 flex flex-col gap-2
          transition-all duration-300 ease-out origin-top
          ${isMobileMenuOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-4 pointer-events-none"}
        `}
      >
        {tree.map((item) =>
          item.kind === "group" ? (
            <div key={item.label} className="w-full">
              <button
                onClick={() => setOpenAccordion(openAccordion === item.label ? null : item.label)}
                className="w-full bg-primary-gold text-white p-2 rounded-xl font-bold text-sm tracking-wider shadow-sm flex justify-between items-center hover:bg-secondary-gold-dark transition-colors"
              >
                <span>{item.label}</span>
                <span
                  className={`text-[10px] transition-transform duration-300 ${openAccordion === item.label ? "rotate-180" : ""}`}
                >
                  ▼
                </span>
              </button>

              <div
                className={`grid transition-all duration-300 ease-in-out ${
                  openAccordion === item.label
                    ? "grid-rows-[1fr] opacity-100 mt-1"
                    : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="bg-[#D8AB44] shadow-inner flex flex-col rounded-xl mb-1">
                    {item.categories.map((category) => (
                      <Link
                        key={category.slug}
                        href={categoryHref(category.slug)}
                        onClick={closeAll}
                        className="block text-tertiary-brown font-bold text-sm p-2 border-b border-white/20 last:border-0 hover:text-white transition-colors text-center"
                      >
                        {category.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div key={item.slug} className="w-full">
              <Link
                href={categoryHref(item.slug)}
                onClick={closeAll}
                className="block w-full bg-primary-gold text-white p-2 rounded-xl font-bold text-sm tracking-wider text-center shadow-sm hover:bg-secondary-gold-dark transition-colors"
              >
                {item.label}
              </Link>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
