/** A tile that opens a file picker: the input inside it is what's focused and announced. */
export default function PickButton({
  icon,
  label,
  accept,
  capture,
  multiple,
  disabled,
  onPick,
}: {
  icon: React.ReactNode;
  label: string;
  accept: string;
  /** Opens the camera instead: the one facing away ("environment") or the selfie one ("user"). */
  capture?: "environment" | "user";
  multiple?: boolean;
  disabled: boolean;
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="flex min-h-[72px] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-tile border border-line bg-surface text-meta font-semibold transition-colors focus-within:outline-2 focus-within:outline-gold-ink hover:bg-hover has-disabled:cursor-not-allowed has-disabled:opacity-60">
      <input
        type="file"
        accept={accept}
        capture={capture}
        multiple={multiple}
        disabled={disabled}
        onChange={onPick}
        className="sr-only"
      />
      <span className="text-gold-ink">{icon}</span>
      {label}
    </label>
  );
}
