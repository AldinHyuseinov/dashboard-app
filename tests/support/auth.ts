import type { Auth } from "@/lib/auth";

/** The headers a browser sends after a response set its session cookie. */
export function sessionFrom(response: Headers) {
  const token = response
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .find((cookie) => cookie.startsWith("better-auth.session_token="));
  if (!token) throw new Error("The response set no session cookie");
  return new Headers({ cookie: token });
}

/** Whether `email` and `password` sign in. */
export async function canSignIn(auth: Auth, email: string, password: string) {
  try {
    await auth.api.signInEmail({ body: { email, password } });
    return true;
  } catch {
    return false;
  }
}
