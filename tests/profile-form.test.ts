import { describe, expect, it } from "vitest";
import { checkDetails, checkPasswordChange } from "@/lib/profile-form";

const IVAN = { name: "Иван Петров", email: "ivan@avexim.test" };

describe("Profile form", () => {
  describe("name and email", () => {
    it("has nothing to change when both are as they were", () => {
      expect(checkDetails(IVAN, IVAN)).toEqual({ ok: true, name: null, email: null });
    });

    it("changes the name, without the spaces around it", () => {
      expect(checkDetails({ ...IVAN, name: "  Иван Иванов " }, IVAN)).toEqual({
        ok: true,
        name: "Иван Иванов",
        email: null,
      });
    });

    it("refuses a name shorter than 2 or longer than 30 characters", () => {
      expect(checkDetails({ ...IVAN, name: " И " }, IVAN)).toEqual({
        ok: false,
        errors: { name: "Името трябва да бъде поне 2 символа" },
      });
      expect(checkDetails({ ...IVAN, name: "И".repeat(31) }, IVAN)).toEqual({
        ok: false,
        errors: { name: "Името трябва да бъде най-много 30 символа" },
      });
    });

    it("changes the email to the new address, in lower case", () => {
      expect(checkDetails({ ...IVAN, email: " Ivan.Petrov@Avexim.test " }, IVAN)).toEqual({
        ok: true,
        name: null,
        email: "ivan.petrov@avexim.test",
      });
    });

    it("treats the same address in other letter case as unchanged", () => {
      expect(checkDetails({ ...IVAN, email: "IVAN@avexim.test" }, IVAN)).toEqual({
        ok: true,
        name: null,
        email: null,
      });
    });

    it("refuses something that isn't an email address", () => {
      expect(checkDetails({ ...IVAN, email: "ivan@" }, IVAN)).toEqual({
        ok: false,
        errors: { email: "Невалиден имейл адрес" },
      });
    });

    it("says what's wrong with both at once", () => {
      expect(checkDetails({ name: "", email: "" }, IVAN)).toEqual({
        ok: false,
        errors: { name: "Името трябва да бъде поне 2 символа", email: "Невалиден имейл адрес" },
      });
    });
  });

  describe("changing the password", () => {
    const good = { oldPassword: "Old-pass1!", newPassword: "New-pass1!", confirmPassword: "New-pass1!" };

    it("has nothing to say about a complete change", () => {
      expect(checkPasswordChange(good)).toEqual({});
    });

    it("asks for the current password", () => {
      expect(checkPasswordChange({ ...good, oldPassword: "" })).toEqual({
        oldPassword: "Въведете старата си парола",
      });
    });

    it("asks for a new password", () => {
      expect(checkPasswordChange({ ...good, newPassword: "", confirmPassword: "" })).toEqual({
        newPassword: "Въведете нова парола",
      });
    });

    it("names the first password rule the new password breaks", () => {
      expect(checkPasswordChange({ ...good, newPassword: "short", confirmPassword: "short" })).toEqual({
        newPassword: "Паролата трябва да бъде поне 8 символа",
      });
    });

    it("refuses a confirmation that doesn't match", () => {
      expect(checkPasswordChange({ ...good, confirmPassword: "New-pass2!" })).toEqual({
        confirmPassword: "Паролите не съвпадат",
      });
    });
  });
});
