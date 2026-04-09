"use client";

export default function LoadingSpinner({ fullPage = false }: { fullPage?: boolean }) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative w-16 h-16">
        {/* Background Pulse Ring */}
        <div className="absolute inset-0 rounded-full border-2 border-primary-gold/20 animate-pulse"></div>

        {/* Rotating Outer Ring */}
        <div className="absolute inset-0 rounded-full border-t-2 border-primary-gold animate-spin"></div>

        {/* Central Logo-style Ring */}
        <div className="absolute inset-2 rounded-full border border-primary-gold/40 flex items-center justify-center">
          {/* The "Logo Dot" */}
          <div className="w-2 h-2 bg-red-800 rounded-full shadow-[0_0_8px_rgba(153,27,27,0.6)]"></div>
        </div>

        {/* Orbiting Dot */}
        <div className="absolute inset-0 animate-[spin_1.5s_linear_infinite]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-primary-gold rounded-full"></div>
        </div>
      </div>

      {/* Optional Brand Text */}
      <span className="text-[10px] font-bold tracking-[0.2em] text-primary-gold uppercase animate-pulse">
        AVEXIM
      </span>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-100 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return <div className="py-10 flex justify-center w-full">{content}</div>;
}
