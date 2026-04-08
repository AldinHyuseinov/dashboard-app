export default function NotFound() {
  return (
    <div className="p-2 mt-2 bg-white/95 backdrop-blur-md shadow-2xl rounded-xl border border-gray-200 text-center mx-4">
      {/* Error Content */}
      <h1 className="text-7xl font-bold text-primary-gold mb-2 drop-shadow-sm">404</h1>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Страницата не е намерена</h2>
      <p className="text-gray-600 mb-2 max-w-sm mx-auto leading-relaxed text-sm">
        Изглежда, че сте попаднали на невалиден линк.
      </p>
    </div>
  );
}
