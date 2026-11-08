import { describe, expect, it } from "vitest";
import {
  getCategoryLabel,
  getCategoryGroupLabel,
  isCategory,
  listCategories,
  listCategorySections,
  listCategoryTree,
} from "@/lib/categories";

const VENUE_CATEGORIES = [
  "golf-clubs",
  "bars",
  "hotels",
  "catering",
  "party-centers",
  "premium-liquor-stores",
  "wedding-agencies",
];

const STANDALONE_CATEGORIES = ["events", "cocktails", "social-media", "resources", "warehouse"];

describe("Categories", () => {
  it("lists every Category, Venues' Categories first, then the standalone ones", () => {
    expect(listCategories().map((c) => c.slug)).toEqual([
      ...VENUE_CATEGORIES,
      ...STANDALONE_CATEGORIES,
    ]);
  });

  it("shows Venues as a Category Group heading over its Categories, followed by the standalone Categories", () => {
    const summary = listCategoryTree().map((item) =>
      item.kind === "group"
        ? { group: item.label, categories: item.categories.map((c) => c.slug) }
        : { category: item.slug },
    );

    expect(summary).toEqual([
      { group: "Обекти", categories: VENUE_CATEGORIES },
      ...STANDALONE_CATEGORIES.map((slug) => ({ category: slug })),
    ]);
  });

  it("names Categories in Bulgarian", () => {
    expect(getCategoryLabel("golf-clubs")).toBe("Голф Клубове");
    expect(getCategoryLabel("premium-liquor-stores")).toBe("Премиум магазини за алкохол");
    expect(getCategoryLabel("warehouse")).toBe("Склад");
  });

  it("accepts every listed Category as valid", () => {
    for (const { slug } of listCategories()) {
      expect(isCategory(slug)).toBe(true);
    }
  });

  it("does not treat Venues as a Category: it holds no Tasks and has no Category label", () => {
    expect(isCategory("venues")).toBe(false);
    expect(getCategoryLabel("venues")).toBeUndefined();
  });

  it("rejects unknown Categories", () => {
    expect(isCategory("nonexistent")).toBe(false);
    expect(isCategory("")).toBe(false);
    expect(isCategory("/golf-clubs")).toBe(false);
    expect(isCategory("toString")).toBe(false);
    expect(getCategoryLabel("nonexistent")).toBeUndefined();
  });

  it("lays Categories out in sections: Venues' Categories under their heading, then the rest under Още категории", () => {
    const sections = listCategorySections().map((s) => ({
      heading: s.heading,
      isGroup: s.isGroup,
      categories: s.categories.map((c) => c.slug),
    }));

    expect(sections).toEqual([
      { heading: "Обекти", isGroup: true, categories: VENUE_CATEGORIES },
      { heading: "Още категории", isGroup: false, categories: STANDALONE_CATEGORIES },
    ]);
  });

  it("names the Category Group a Category belongs to, and none for a standalone Category", () => {
    expect(getCategoryGroupLabel("wedding-agencies")).toBe("Обекти");
    expect(getCategoryGroupLabel("warehouse")).toBeUndefined();
    expect(getCategoryGroupLabel("nonexistent")).toBeUndefined();
  });
});
