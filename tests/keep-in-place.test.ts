import { describe, expect, it } from "vitest";
import { keepInPlace } from "@/lib/keep-in-place";

const row = (id: string, isDone = false) => ({ id, isDone });
const ids = (rows: { id: string }[]) => rows.map((r) => r.id);

describe("Keeping tapped rows in place", () => {
  it("shows the fresh order when nothing is held", () => {
    const shown = [row("a"), row("b"), row("c")];
    const fresh = [row("c"), row("a"), row("b")];

    expect(ids(keepInPlace(shown, fresh, new Set()))).toEqual(["c", "a", "b"]);
  });

  it("keeps a row marked Done where it was, with its fresh status, though it moved to the top", () => {
    const shown = [row("a"), row("b"), row("c")];
    const fresh = [row("c", true), row("a"), row("b")];

    expect(keepInPlace(shown, fresh, new Set(["c"]))).toEqual([row("a"), row("b"), row("c", true)]);
  });

  it("keeps a held row that moved to another page, as it was last shown", () => {
    const shown = [row("d"), row("e", true), row("f")];
    const fresh = [row("d"), row("f"), row("g")];

    expect(keepInPlace(shown, fresh, new Set(["e"]))).toEqual([row("d"), row("e", true), row("f"), row("g")]);
  });

  it("lets new rows and other changes follow the fresh order around the held ones", () => {
    const shown = [row("a"), row("b"), row("c")];
    const fresh = [row("new"), row("b", true), row("c"), row("a")];

    expect(ids(keepInPlace(shown, fresh, new Set(["b"])))).toEqual(["new", "b", "c", "a"]);
  });

  it("keeps several held rows each at its own place", () => {
    const shown = [row("a"), row("b"), row("c"), row("d")];
    const fresh = [row("d", true), row("b", true), row("a"), row("c")];

    expect(ids(keepInPlace(shown, fresh, new Set(["b", "d"])))).toEqual(["a", "b", "c", "d"]);
  });
});
