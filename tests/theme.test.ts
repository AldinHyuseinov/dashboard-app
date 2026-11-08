import { describe, expect, it } from "vitest";
import { THEMES, readTheme, themeColor } from "@/lib/theme";

describe("Appearance", () => {
  it("is light, automatic or dark, in that order", () => {
    expect(THEMES.map((theme) => theme.id)).toEqual(["light", "auto", "dark"]);
  });

  it("follows the device until the person chooses otherwise", () => {
    expect(readTheme(undefined)).toBe("auto");
  });

  it("keeps the person's choice", () => {
    expect(readTheme("light")).toBe("light");
    expect(readTheme("auto")).toBe("auto");
    expect(readTheme("dark")).toBe("dark");
  });

  it("follows the device when the stored choice isn't one it knows", () => {
    expect(readTheme("sepia")).toBe("auto");
    expect(readTheme("")).toBe("auto");
  });

  describe("the browser and status bar colour", () => {
    it("is the top bar's gold in light appearance", () => {
      expect(themeColor("light")).toBe("#cda349");
    });

    it("is the top bar's dark surface in dark appearance", () => {
      expect(themeColor("dark")).toBe("#1e1912");
    });

    it("follows the device in automatic appearance", () => {
      expect(themeColor("auto")).toEqual([
        { media: "(prefers-color-scheme: light)", color: "#cda349" },
        { media: "(prefers-color-scheme: dark)", color: "#1e1912" },
      ]);
    });
  });
});
