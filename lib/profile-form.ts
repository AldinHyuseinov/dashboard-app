/**
 * The Profile's two forms: the name and email, and changing the password.
 * What they check before anything reaches better-auth, which applies the
 * password rules again on its own.
 */

import { z } from "zod";
import { passwordProblems } from "@/lib/password-rules";

const NAME_MIN = 2;
const NAME_MAX = 30;

type Details = { name: string; email: string };

/**
 * The changes the name and email form asks for: each is `null` when it's
 * as it was. An email change still waits for the code sent to the new address.
 */
export type DetailsCheck =
  | { ok: true; name: string | null; email: string | null }
  | { ok: false; errors: { name?: string; email?: string } };

export function checkDetails(input: Details, current: Details): DetailsCheck {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const errors: { name?: string; email?: string } = {};

  if (name.length < NAME_MIN) errors.name = `Името трябва да бъде поне ${NAME_MIN} символа`;
  else if (name.length > NAME_MAX) errors.name = `Името трябва да бъде най-много ${NAME_MAX} символа`;

  const sameEmail = email === current.email.toLowerCase();
  if (!sameEmail && !z.email().safeParse(email).success) errors.email = "Невалиден имейл адрес";

  if (errors.name || errors.email) return { ok: false, errors };
  return {
    ok: true,
    name: name === current.name ? null : name,
    email: sameEmail ? null : email,
  };
}

export type PasswordChange = { oldPassword: string; newPassword: string; confirmPassword: string };

/** What's wrong with a password change, field by field; empty when it can go ahead. */
export function checkPasswordChange(input: PasswordChange): Partial<PasswordChange> {
  const errors: Partial<PasswordChange> = {};
  if (!input.oldPassword) errors.oldPassword = "Въведете старата си парола";

  const [problem] = passwordProblems(input.newPassword);
  if (!input.newPassword) errors.newPassword = "Въведете нова парола";
  else if (problem) errors.newPassword = problem;
  else if (input.newPassword !== input.confirmPassword) {
    errors.confirmPassword = "Паролите не съвпадат";
  }
  return errors;
}
