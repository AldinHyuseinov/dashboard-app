/** Error codes this app's auth configuration answers with, beside better-auth's own. */
export const AUTH_ERROR = {
  WEAK_PASSWORD: "WEAK_PASSWORD",
  EMAIL_IN_USE: "EMAIL_IN_USE",
  SIGN_IN_CODES_OFF: "SIGN_IN_CODES_OFF",
} as const;

/** Whether `text` has a code's shape: exactly 6 digits. */
export function isCode(text: string): boolean {
  return /^\d{6}$/.test(text);
}

/** What to say when what was typed isn't shaped like a code. */
export const NOT_A_CODE = "Кодът е 6 цифри.";

/** An error better-auth answered a code or password request with. */
export type AuthError = { code?: string; status?: number; message?: string };

/** What to tell someone whose code, or the new password sent with it, was refused. */
export function codeErrorMessage(error: AuthError): string {
  if (error.status === 429) return "Твърде много опити. Изчакайте минута и опитайте отново.";
  switch (error.code) {
    case "INVALID_OTP":
      // better-auth also answers this once a code has run out of attempts.
      return "Грешен код. Проверете го или поискайте нов код.";
    case "OTP_EXPIRED":
      return "Кодът е изтекъл. Поискайте нов код.";
    case "TOO_MANY_ATTEMPTS":
      return "Твърде много грешни опити. Поискайте нов код.";
    case "INVALID_EMAIL":
      return "Невалиден имейл адрес.";
    case AUTH_ERROR.WEAK_PASSWORD:
      return error.message ?? "Паролата не отговаря на изискванията.";
    case AUTH_ERROR.EMAIL_IN_USE:
      return "Този имейл вече се използва.";
  }
  return "Възникна грешка. Моля, опитайте отново.";
}
