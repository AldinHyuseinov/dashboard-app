import { beforeEach, describe, expect, it } from "vitest";
import sharp from "sharp";
import { InMemoryEmailAdapter } from "@/lib/email-adapter";
import { InMemoryPushAdapter } from "@/lib/push-adapter";
import { createNotifications } from "@/lib/notifications";
import { createTasks } from "@/lib/tasks";
import { createFiles } from "@/lib/files";
import { MAX_FILE_SIZE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import type { Actor } from "@/lib/actor";
import { bytesOf, createUser, uploadFile } from "./support/fixtures";

const MONDAY_8AM = new Date("2026-11-02T08:00:00Z");
const MONDAY_9AM = new Date("2026-11-02T09:00:00Z");
const MONDAY_10AM = new Date("2026-11-02T10:00:00Z");
const TUESDAY_7AM = new Date("2026-11-03T07:00:00Z");
const TUESDAY_9AM = new Date("2026-11-03T09:00:00Z");

const FILE_REFUSED = "Някои от файловете не могат да бъдат прикачени. Качете ги отново.";

describe("Files", () => {
  let tasks: ReturnType<typeof createTasks>;
  let files: ReturnType<typeof createFiles>;

  beforeEach(() => {
    tasks = createTasks({
      notifications: createNotifications({ emailAdapter: new InMemoryEmailAdapter(), pushAdapter: new InMemoryPushAdapter() }),
    });
    files = createFiles({
      // Stands in for FFmpeg: every video "compresses" to the same bytes.
      compressVideo: async () => Buffer.from("compressed mp4"),
    });
  });

  async function postTask(owner: Actor, fileIds: string[] = []) {
    const result = await tasks.create(owner, {
      title: "Нова винена листа",
      description: "Да се обнови до петък",
      category: "golf-clubs",
      fileIds,
      now: MONDAY_9AM,
    });
    if (!result.ok) throw new Error(`Could not post a Task: ${JSON.stringify(result.errors)}`);
    return result.task;
  }

  const editTask = (
    owner: Actor,
    taskId: string,
    { addedFileIds = [] as string[], removedFileIds = [] as string[], title = "Нова винена листа" },
  ) =>
    tasks.edit(owner, {
      taskId,
      title,
      description: "Да се обнови до петък",
      addedFileIds,
      removedFileIds,
      now: MONDAY_10AM,
    });

  const fileIdsOf = async (actor: Actor, taskId: string) =>
    (await tasks.get(actor, taskId))?.files.map((f) => f.id);

  const uploadFiles = (uploader: Actor, count: number) =>
    Promise.all(
      Array.from(
        { length: count },
        async (_, i) => (await uploadFile(uploader, { fileName: `${i}.pdf` })).id,
      ),
    );

  describe("uploading", () => {
    it("stores a document as it is, and any signed-in user can download it", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");

      const upload = await files.upload(ivan, {
        file: new File(["съдържание"], "Договор за доставка.pdf", { type: "application/pdf" }),
        now: MONDAY_8AM,
      });
      expect(upload).toMatchObject({ ok: true });
      if (!upload.ok) return;

      const read = await files.read(maria, upload.file.id);
      expect(read).toMatchObject({
        ok: true,
        file: { fileName: "Договор за доставка.pdf", fileType: "application/pdf" },
        range: null,
      });
      if (!read.ok) return;
      expect((await bytesOf(read)).toString()).toBe("съдържание");
    });

    it("turns an image into webp at most 1280px wide", async () => {
      const ivan = await createUser("Ivan");
      const photo = await sharp({
        create: { width: 2000, height: 1000, channels: 3, background: "#c9a227" },
      })
        .png()
        .toBuffer();

      const upload = await files.upload(ivan, {
        file: new File([new Uint8Array(photo)], "снимка.png", { type: "image/png" }),
        now: MONDAY_8AM,
      });
      if (!upload.ok) throw new Error(upload.error);

      const read = await files.read(ivan, upload.file.id);
      if (!read.ok) throw new Error(read.reason);
      expect(read.file).toMatchObject({ fileName: "снимка.png", fileType: "image/webp" });
      const stored = await sharp(await bytesOf(read)).metadata();
      expect(stored).toMatchObject({ format: "webp", width: 1280, height: 640 });
    });

    it("keeps an image it can't process as it was uploaded", async () => {
      const ivan = await createUser("Ivan");

      const upload = await files.upload(ivan, {
        file: new File(["not an image"], "повредена.png", { type: "image/png" }),
        now: MONDAY_8AM,
      });
      if (!upload.ok) throw new Error(upload.error);

      const read = await files.read(ivan, upload.file.id);
      expect(read).toMatchObject({ ok: true, file: { fileType: "image/png" } });
    });

    it("turns a video into mp4, renaming it to .mp4", async () => {
      const ivan = await createUser("Ivan");

      const upload = await files.upload(ivan, {
        file: new File(["raw video"], "клип.от.събитието.mov", { type: "video/quicktime" }),
        now: MONDAY_8AM,
      });
      if (!upload.ok) throw new Error(upload.error);

      const read = await files.read(ivan, upload.file.id);
      if (!read.ok) throw new Error(read.reason);
      expect(read.file).toMatchObject({
        fileName: "клип.от.събитието.mp4",
        fileType: "video/mp4",
      });
      expect((await bytesOf(read)).toString()).toBe("compressed mp4");
    });

    it("refuses a video it can't convert, with the 5-minute limit in the error", async () => {
      const ivan = await createUser("Ivan");
      files = createFiles({
        compressVideo: async () => {
          throw new Error("FFmpeg exited with error code 1");
        },
      });

      const upload = await files.upload(ivan, {
        file: new File(["too long"], "клип.mp4", { type: "video/mp4" }),
        now: MONDAY_8AM,
      });

      expect(upload).toEqual({
        ok: false,
        reason: "processing-failed",
        error: "Грешка при обработка на видеото. (Макс. дължина: 5 минути.)",
      });
    });

    it("refuses a file over 300MB without reading it", async () => {
      const ivan = await createUser("Ivan");
      const huge = {
        name: "огромен.zip",
        type: "application/zip",
        size: MAX_FILE_SIZE + 1,
        arrayBuffer: () => Promise.reject(new Error("must not be read")),
      };

      const upload = await files.upload(ivan, { file: huge, now: MONDAY_8AM });

      expect(upload).toEqual({
        ok: false,
        reason: "invalid",
        error: 'Файлът "огромен.zip" е твърде голям. Максималният размер е 300MB.',
      });
    });

    it("refuses an upload without a file", async () => {
      const ivan = await createUser("Ivan");

      expect(await files.upload(ivan, { file: null, now: MONDAY_8AM })).toEqual({
        ok: false,
        reason: "invalid",
        error: "Няма избран файл.",
      });
    });
  });

  describe("reading", () => {
    // 2.5 MiB, so a read can span more than one slice of the stored data.
    const contents = new Uint8Array(2.5 * 1024 * 1024).map((_, i) => i % 251);
    const size = contents.length;
    const slice = (start: number, end: number) => Buffer.from(contents.subarray(start, end + 1));

    it("is refused without a session", async () => {
      const ivan = await createUser("Ivan");
      const { id } = await uploadFile(ivan);

      expect(await files.read(null, id)).toEqual({ ok: false, reason: "unauthenticated" });
      expect(await files.read(null, id, { range: { start: 0, end: 1 } })).toEqual({
        ok: false,
        reason: "unauthenticated",
      });
    });

    it("streams the whole file when no range is asked for", async () => {
      const ivan = await createUser("Ivan");
      const { id } = await uploadFile(ivan, { fileName: "запис.pdf", contents });

      const read = await files.read(ivan, id);

      if (!read.ok) throw new Error(read.reason);
      expect(read).toMatchObject({ file: { fileName: "запис.pdf", size }, range: null });
      expect((await bytesOf(read)).equals(Buffer.from(contents))).toBe(true);
    });

    it("reads the first two bytes, as an iPhone asks before playing a video", async () => {
      const ivan = await createUser("Ivan");
      const { id } = await uploadFile(ivan, { contents });

      const read = await files.read(ivan, id, { range: { start: 0, end: 1 } });

      if (!read.ok) throw new Error(read.reason);
      expect(read).toMatchObject({ file: { size }, range: { start: 0, end: 1 } });
      expect(await bytesOf(read)).toEqual(slice(0, 1));
    });

    it("reads a range from the middle that spans slices of the stored data", async () => {
      const ivan = await createUser("Ivan");
      const { id } = await uploadFile(ivan, { contents });

      const read = await files.read(ivan, id, { range: { start: 1000, end: 2_100_000 } });

      if (!read.ok) throw new Error(read.reason);
      expect(read.range).toEqual({ start: 1000, end: 2_100_000 });
      expect((await bytesOf(read)).equals(slice(1000, 2_100_000))).toBe(true);
    });

    it("reads from a byte to the end of the file", async () => {
      const ivan = await createUser("Ivan");
      const { id } = await uploadFile(ivan, { contents });

      const read = await files.read(ivan, id, { range: { start: size - 10 } });

      if (!read.ok) throw new Error(read.reason);
      expect(read.range).toEqual({ start: size - 10, end: size - 1 });
      expect(await bytesOf(read)).toEqual(slice(size - 10, size - 1));
    });

    it("reads the last bytes of the file", async () => {
      const ivan = await createUser("Ivan");
      const { id } = await uploadFile(ivan, { contents });

      const read = await files.read(ivan, id, { range: { suffix: 500 } });

      if (!read.ok) throw new Error(read.reason);
      expect(read.range).toEqual({ start: size - 500, end: size - 1 });
      expect(await bytesOf(read)).toEqual(slice(size - 500, size - 1));
    });

    it("stops a range that runs past the end at the last byte", async () => {
      const ivan = await createUser("Ivan");
      const { id } = await uploadFile(ivan, { contents: new Uint8Array([1, 2, 3, 4]) });

      const read = await files.read(ivan, id, { range: { start: 2, end: 99 } });

      if (!read.ok) throw new Error(read.reason);
      expect(read.range).toEqual({ start: 2, end: 3 });
      expect(await bytesOf(read)).toEqual(Buffer.from([3, 4]));
    });

    it("reads the whole file when asked for more last bytes than it has", async () => {
      const ivan = await createUser("Ivan");
      const { id } = await uploadFile(ivan, { contents: new Uint8Array([1, 2, 3, 4]) });

      const read = await files.read(ivan, id, { range: { suffix: 10 } });

      if (!read.ok) throw new Error(read.reason);
      expect(read.range).toEqual({ start: 0, end: 3 });
      expect(await bytesOf(read)).toEqual(Buffer.from([1, 2, 3, 4]));
    });

    it("can't satisfy a range that starts past the end, and says how big the file is", async () => {
      const ivan = await createUser("Ivan");
      const { id } = await uploadFile(ivan, { contents: new Uint8Array([1, 2, 3, 4]) });

      expect(await files.read(ivan, id, { range: { start: 4 } })).toEqual({
        ok: false,
        reason: "unsatisfiable",
        size: 4,
      });
      expect(await files.read(ivan, id, { range: { suffix: 0 } })).toEqual({
        ok: false,
        reason: "unsatisfiable",
        size: 4,
      });
    });

    it("reports a file that doesn't exist", async () => {
      const ivan = await createUser("Ivan");

      expect(await files.read(ivan, "missing-file")).toEqual({
        ok: false,
        reason: "not-found",
      });
      expect(await files.read(ivan, "missing-file", { range: { start: 0, end: 1 } })).toEqual({
        ok: false,
        reason: "not-found",
      });
    });
  });

  describe("attaching files to a Task", () => {
    it("Ivan's new Task takes the files he just uploaded", async () => {
      const ivan = await createUser("Ivan");
      const uploads = await uploadFiles(ivan, 2);

      const { id } = await postTask(ivan, uploads);

      expect(await fileIdsOf(ivan, id)).toEqual(expect.arrayContaining(uploads));
    });

    it("Maria's new Task can't take a file from Ivan's Task, and Ivan keeps it", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const [ivansFile] = await uploadFiles(ivan, 1);
      const ivansTask = await postTask(ivan, [ivansFile]);

      const result = await tasks.create(maria, {
        title: "Чужди файлове",
        description: "Опит да взема файла",
        category: "bars",
        fileIds: [ivansFile],
        now: MONDAY_10AM,
      });

      expect(result).toEqual({ ok: false, errors: { files: [FILE_REFUSED] } });
      expect(await fileIdsOf(ivan, ivansTask.id)).toEqual([ivansFile]);
      expect(await tasks.list(maria, { category: "bars", page: 1 })).toMatchObject({ tasks: [] });
    });

    it("Maria's edit can't take a file from Ivan's Task; her Task is left unchanged", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const [ivansFile] = await uploadFiles(ivan, 1);
      const ivansTask = await postTask(ivan, [ivansFile]);
      const mariasTask = await postTask(maria);

      const result = await editTask(maria, mariasTask.id, {
        title: "Променено заглавие",
        addedFileIds: [ivansFile],
      });

      expect(result).toEqual({ ok: false, errors: { files: [FILE_REFUSED] } });
      expect(await fileIdsOf(ivan, ivansTask.id)).toEqual([ivansFile]);
      expect(await tasks.get(maria, mariasTask.id)).toMatchObject({
        title: "Нова винена листа",
        files: [],
      });
    });

    it("Maria can't attach a file Ivan uploaded but hasn't attached yet", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const [ivansUpload] = await uploadFiles(ivan, 1);
      const mariasTask = await postTask(maria);

      const result = await editTask(maria, mariasTask.id, { addedFileIds: [ivansUpload] });

      expect(result).toEqual({ ok: false, errors: { files: [FILE_REFUSED] } });
      // Ivan can still attach it himself.
      const { id } = await postTask(ivan, [ivansUpload]);
      expect(await fileIdsOf(ivan, id)).toEqual([ivansUpload]);
    });

    it("refuses the whole save when only one of the files is someone else's", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const [mariasUpload] = await uploadFiles(maria, 1);
      const [ivansUpload] = await uploadFiles(ivan, 1);

      const result = await tasks.create(maria, {
        title: "Смесени файлове",
        description: "Един мой, един чужд",
        category: "bars",
        fileIds: [mariasUpload, ivansUpload],
        now: MONDAY_10AM,
      });

      expect(result).toEqual({ ok: false, errors: { files: [FILE_REFUSED] } });
      // Maria's own upload is still free to attach.
      const { id } = await postTask(maria, [mariasUpload]);
      expect(await fileIdsOf(maria, id)).toEqual([mariasUpload]);
    });

    it("refuses a file that doesn't exist", async () => {
      const ivan = await createUser("Ivan");
      const { id } = await postTask(ivan);

      const result = await editTask(ivan, id, { addedFileIds: ["missing-file"] });

      expect(result).toEqual({ ok: false, errors: { files: [FILE_REFUSED] } });
    });

    it("a new Task takes at most 10 files", async () => {
      const ivan = await createUser("Ivan");

      const result = await tasks.create(ivan, {
        title: "Снимки от събитието",
        description: "Всички снимки",
        category: "events",
        fileIds: await uploadFiles(ivan, 11),
        now: MONDAY_9AM,
      });

      expect(result).toEqual({
        ok: false,
        errors: { files: ["Можете да прикачите максимум 10 файла."] },
      });
    });

    it("an edit counts the files kept, removed and added against the limit of 10", async () => {
      const ivan = await createUser("Ivan");
      const existing = await uploadFiles(ivan, 8);
      const { id } = await postTask(ivan, existing);
      const edit = (addedFileIds: string[]) =>
        editTask(ivan, id, { addedFileIds, removedFileIds: [existing[0]] });

      expect(await edit(await uploadFiles(ivan, 4))).toEqual({
        ok: false,
        errors: {
          files: ["Тази задача вече има 7 запазени файла. Можете да добавите максимум още 3."],
        },
      });
      expect(await fileIdsOf(ivan, id)).toHaveLength(8);

      expect(await edit(await uploadFiles(ivan, 3))).toMatchObject({ ok: true });
      const kept = await fileIdsOf(ivan, id);
      expect(kept).toHaveLength(10);
      expect(kept).not.toContain(existing[0]);
    });

    it("removing files that aren't on the Task makes no room under the limit", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const [mariasFile] = await uploadFiles(maria, 1);
      const mariasTask = await postTask(maria, [mariasFile]);
      const { id } = await postTask(ivan, await uploadFiles(ivan, 10));

      const result = await editTask(ivan, id, {
        addedFileIds: await uploadFiles(ivan, 1),
        removedFileIds: [mariasFile, "missing-file"],
      });

      expect(result).toEqual({
        ok: false,
        errors: {
          files: ["Тази задача вече има 10 запазени файла. Можете да добавите максимум още 0."],
        },
      });
      expect(await fileIdsOf(ivan, id)).toHaveLength(10);
      expect(await fileIdsOf(maria, mariasTask.id)).toEqual([mariasFile]);
    });
  });

  describe("cleaning up abandoned uploads", () => {
    it("an upload never attached is deleted once it is older than 24 hours", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const abandoned = await uploadFile(ivan, { now: MONDAY_8AM });
      const recent = await uploadFile(ivan, { now: MONDAY_9AM });

      // Maria's upload a day and an hour later triggers the cleanup.
      await files.upload(maria, {
        file: new File(["x"], "отчет.pdf", { type: "application/pdf" }),
        now: TUESDAY_9AM,
      });

      expect(await files.read(ivan, abandoned.id)).toEqual({ ok: false, reason: "not-found" });
      expect(await files.read(ivan, recent.id)).toMatchObject({ ok: true });
    });

    it("keeps old files that are attached to a Task", async () => {
      const ivan = await createUser("Ivan");
      const attached = await uploadFile(ivan, { now: MONDAY_8AM });
      await postTask(ivan, [attached.id]);

      await uploadFile(ivan, { now: TUESDAY_9AM });

      expect(await files.read(ivan, attached.id)).toMatchObject({ ok: true });
    });

    it("keeps an unattached upload that is less than 24 hours old", async () => {
      const ivan = await createUser("Ivan");
      const upload = await uploadFile(ivan, { now: MONDAY_8AM });

      await uploadFile(ivan, { now: TUESDAY_7AM });

      expect(await files.read(ivan, upload.id)).toMatchObject({ ok: true });
    });

    it("also deletes old unattached files from before uploaders were recorded", async () => {
      const ivan = await createUser("Ivan");
      const legacy = await prisma.taskFile.create({
        data: {
          fileName: "стар.pdf",
          fileType: "application/pdf",
          data: Buffer.from("old"),
          createdAt: MONDAY_8AM,
        },
        select: { id: true },
      });

      await uploadFile(ivan, { now: TUESDAY_9AM });

      expect(await files.read(ivan, legacy.id)).toEqual({ ok: false, reason: "not-found" });
    });
  });
});
