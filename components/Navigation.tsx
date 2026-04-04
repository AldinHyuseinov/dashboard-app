export default function Navigation() {
  const navLinks = ["Обекти", "Събития", "Коктейли", "Социални мрежи", "Ресурси", "Склад"];

  return (
    <nav className="border border-gray-400 rounded-full p-1 mt-2 bg-white flex flex-wrap justify-center items-center gap-1 shadow-sm max-w-50">
      {navLinks.map((link) => (
        <button
          key={link}
          className="bg-primary-gold text-white p-1 rounded-full font-bold text-sm tracking-wider hover:bg-secondary-gold-dark transition-colors shadow-sm cursor-pointer"
        >
          {link}
        </button>
      ))}
    </nav>
  );
}
