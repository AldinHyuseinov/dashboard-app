import { describe, expect, it } from "vitest";
import {
  checkPicked,
  draftErrors,
  fileKind,
  fileSizeLabel,
  uploadStatus,
  type PickedFile,
} from "@/lib/task-form";

const MB = 1024 * 1024;

function picked(name: string, { size = 2 * MB, type = "image/jpeg", seconds }: { size?: number; type?: string; seconds?: number } = {}): PickedFile {
  return { name, size, type, durationSeconds: seconds };
}

describe("Task form", () => {
  describe("draft errors", () => {
    it("asks for a Category, a title and a description", () => {
      expect(draftErrors({ category: "", title: " ", description: "" })).toEqual({
        category: "Изберете категория.",
        title: "Въведете заглавие.",
        description: "Въведете описание.",
      });
    });

    it("refuses Venues, which is a Category Group, not a Category", () => {
      expect(draftErrors({ category: "venues", title: "А", description: "Б" })).toEqual({
        category: "Изберете категория.",
      });
    });

    it("has nothing to say about a complete draft", () => {
      expect(draftErrors({ category: "bars", title: "Доставка", description: "40 каси" })).toEqual({});
    });
  });

  describe("checking picked files", () => {
    it("accepts files within the limits", () => {
      const files = [picked("a.jpg"), picked("b.mp4", { type: "video/mp4", seconds: 42 })];
      expect(checkPicked(files, { room: 10 })).toEqual({ accepted: files, errors: [] });
    });

    it("refuses a file over 300 MB, saying what to do", () => {
      const big = picked("obhod.mov", { size: 301 * MB, type: "video/quicktime", seconds: 60 });
      expect(checkPicked([big], { room: 10 })).toEqual({
        accepted: [],
        errors: ["„obhod.mov“ е по-голям от 300 MB. Изберете по-малък файл."],
      });
    });

    it("refuses a video longer than 5 minutes, saying what to do", () => {
      const long = picked("sklad.mp4", { type: "video/mp4", seconds: 301 });
      expect(checkPicked([long], { room: 10 })).toEqual({
        accepted: [],
        errors: ["Видеото „sklad.mp4“ е по-дълго от 5 минути. Съкратете го и го добавете отново."],
      });
    });

    it("refuses a file that isn't a common image, a video or a PDF, such as an iPhone's HEIC", () => {
      const heic = picked("IMG_4812.HEIC", { type: "image/heic" });
      expect(checkPicked([heic], { room: 10 })).toEqual({
        accepted: [],
        errors: ["„IMG_4812.HEIC“ не може да се прикачи. Изберете снимка (JPEG, PNG, WebP или GIF), видео или PDF."],
      });
    });

    it("accepts a PDF even when the browser gives it no type", () => {
      const pdf = picked("oferta.pdf", { type: "" });
      expect(checkPicked([pdf], { room: 10 }).accepted).toEqual([pdf]);
    });

    it("accepts a video whose length the browser can't tell, for the server to check", () => {
      const unknown = picked("clip.mov", { type: "video/quicktime" });
      expect(checkPicked([unknown], { room: 10 }).accepted).toEqual([unknown]);
    });

    it("takes only as many files as there's room for, and says how many were left out", () => {
      const files = [picked("a.jpg"), picked("b.jpg"), picked("c.jpg")];
      expect(checkPicked(files, { room: 1 })).toEqual({
        accepted: [files[0]],
        errors: ["Задачата може да има най-много 10 файла. 2 файла не бяха добавени."],
      });
    });

    it("says one file was left out in the singular", () => {
      const files = [picked("a.jpg"), picked("b.jpg")];
      expect(checkPicked(files, { room: 1 }).errors).toEqual([
        "Задачата може да има най-много 10 файла. 1 файл не беше добавен.",
      ]);
    });

    it("doesn't count refused files against the room", () => {
      const big = picked("big.mp4", { size: 400 * MB, type: "video/mp4" });
      const small = picked("a.jpg");
      expect(checkPicked([big, small], { room: 1 }).accepted).toEqual([small]);
    });
  });

  describe("upload status", () => {
    it("shows how far the current file has been sent", () => {
      expect(uploadStatus({ index: 1, total: 3, sent: 0.456 })).toBe("Качване на файл 2 от 3 · 46%");
    });

    it("says the server is processing once the file is sent", () => {
      expect(uploadStatus({ index: 0, total: 1, sent: 1 })).toBe("Обработка на файл 1 от 1…");
    });
  });

  describe("file labels", () => {
    it.each([
      [180 * 1024, "180 KB"],
      [2.4 * MB, "2,4 MB"],
      [12 * MB, "12 MB"],
      [500, "1 KB"],
    ])("shows %d bytes as %s", (bytes, label) => {
      expect(fileSizeLabel(bytes)).toBe(label);
    });

    it.each([
      ["image/webp", "snimka.webp", "image"],
      ["video/mp4", "obhod.mp4", "video"],
      ["application/pdf", "oferta.pdf", "pdf"],
      ["", "oferta.PDF", "pdf"],
      ["application/octet-stream", "spisak.xlsx", "file"],
    ])("treats %s %s as %s", (type, name, kind) => {
      expect(fileKind(type, name)).toBe(kind);
    });
  });
});
