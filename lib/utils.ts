export const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat("bg-BG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};

/** Up to two initials from a person's name, for an avatar: "Елена Стоянова" → "ЕС". */
export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toLocaleUpperCase("bg-BG"))
    .join("");
