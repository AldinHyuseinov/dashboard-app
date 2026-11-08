import { describe, expect, it } from "vitest";
import { screenAt } from "@/lib/navigation";

describe("Navigation", () => {
  it("treats the Activity Feed as a top-level screen under the Feed item, with no way back", () => {
    expect(screenAt("/")).toEqual({ navItem: "feed", back: null });
  });

  it("treats Categories, New task and Profile as top-level screens under their own items", () => {
    expect(screenAt("/categories")).toEqual({ navItem: "categories", back: null });
    expect(screenAt("/new")).toEqual({ navItem: "new-task", back: null });
    expect(screenAt("/profile")).toEqual({ navItem: "profile", back: null });
  });

  it("puts a Category's Task list under Categories, going back to Categories", () => {
    expect(screenAt("/category/bars")).toEqual({
      navItem: "categories",
      back: { href: "/categories", label: "Категории" },
    });
  });

  it("puts a Task under Categories, going back to its Category's Task list", () => {
    expect(screenAt("/category/bars/task-1")).toEqual({
      navItem: "categories",
      back: { href: "/category/bars", label: "Барове" },
    });
  });

  it("goes back from editing a Task to the Task", () => {
    expect(screenAt("/category/bars/task-1/edit")).toEqual({
      navItem: "categories",
      back: { href: "/category/bars/task-1", label: "Задача" },
    });
  });

  it("puts posting into a Category under New task, going back to that Category", () => {
    expect(screenAt("/category/events/create")).toEqual({
      navItem: "new-task",
      back: { href: "/category/events", label: "Събития" },
    });
  });

  it("puts New task's second step under New task, going back to choosing the Category", () => {
    expect(screenAt("/new/bars")).toEqual({
      navItem: "new-task",
      back: { href: "/new", label: "Категория" },
    });
  });

  it("still offers a way back from a Task whose Category doesn't exist", () => {
    expect(screenAt("/category/no-such-category/task-1").back).toEqual({
      href: "/category/no-such-category",
      label: "Назад",
    });
  });

  it("goes back to the Activity Feed from any other screen", () => {
    expect(screenAt("/no-such-page")).toEqual({
      navItem: null,
      back: { href: "/", label: "Активност" },
    });
  });

  it("ignores a trailing slash", () => {
    expect(screenAt("/categories/")).toEqual(screenAt("/categories"));
    expect(screenAt("/category/bars/")).toEqual(screenAt("/category/bars"));
  });
});
