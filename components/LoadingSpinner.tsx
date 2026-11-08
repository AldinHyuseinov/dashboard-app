"use client";

export default function LoadingSpinner({ fullPage = false }: { fullPage?: boolean }) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-8">
      <div className="relative w-32 h-32">
        {/* Background Pulse Ring */}
        <div className="absolute inset-0 rounded-full border-2 border-gold/20 animate-pulse"></div>

        {/* Rotating Outer Ring */}
        <div className="absolute inset-0 rounded-full border-t-2 border-gold animate-spin"></div>

        {/* Central Logo-style Ring */}
        <div className="absolute inset-4 rounded-full border border-gold/40 flex items-center justify-center">
          {/* The centre dot: gold, since red is kept for Unread. */}
          <div className="w-4 h-4 bg-gold-ink rounded-full"></div>
        </div>

        {/* Orbiting Dot */}
        <div className="absolute inset-0 animate-[spin_1.5s_linear_infinite]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-gold rounded-full"></div>
        </div>
      </div>

      {/* Optional Brand Text */}
      <span className="text-[10px] font-bold tracking-[0.2em] text-gold-ink uppercase animate-pulse">
        AVEXIM
      </span>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-100 flex items-center justify-center bg-bg/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return <div className="py-20 flex justify-center w-full">{content}</div>;
}
