/** A form's error that belongs to no single field. Read out as soon as it appears. */
export function FormError({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-tile border border-error p-2 text-secondary font-semibold text-error"
    >
      {children}
    </p>
  );
}

/** News for the person filling in a form: a code was sent, a change was saved. */
export function FormNotice({
  tone = "info",
  children,
}: {
  tone?: "info" | "success";
  children: React.ReactNode;
}) {
  return (
    <p
      role="status"
      className={`rounded-tile p-2 text-secondary text-ink ${tone === "success" ? "bg-vine-tint" : "bg-tint"}`}
    >
      {children}
    </p>
  );
}
