import Logo from "./Logo";

/**
 * The gold brand panel for screens outside the shell (sign-in, not found): a
 * band across the top on phones, a column beside the content on desktop.
 */
export default function BrandPanel() {
  return (
    <div className="on-bar safe-top flex shrink-0 flex-col bg-bar text-bar-ink lg:sticky lg:top-0 lg:h-dvh lg:w-[40%] lg:max-w-[560px]">
      <div className="safe-x flex flex-col gap-1 py-3 lg:flex-1 lg:justify-between lg:p-8">
        <Logo height={32} eager />
        <p className="eyebrow">Комуникационна платформа</p>
      </div>
    </div>
  );
}
