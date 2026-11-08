import { beforeEach, describe, expect, it } from "vitest";
import { createFiles } from "@/lib/files";
import { fileResponse, parseRange } from "@/lib/file-response";
import type { Actor } from "@/lib/actor";
import { createUser, uploadFile } from "./support/fixtures";

describe("parsing a Range header", () => {
  it.each([
    ["bytes=0-1", { start: 0, end: 1 }],
    ["bytes=500-999", { start: 500, end: 999 }],
    ["bytes=500-", { start: 500 }],
    ["bytes=-500", { suffix: 500 }],
    [" bytes=0-1 ", { start: 0, end: 1 }],
    ["Bytes=0-1", { start: 0, end: 1 }],
  ])("reads %j as %j", (header, range) => {
    expect(parseRange(header)).toEqual(range);
  });

  it.each([
    null,
    "",
    "bytes=",
    "bytes=-",
    "bytes=5-2",
    "bytes=a-b",
    "bytes=0-1,5-6",
    "items=0-1",
  ])("ignores %j, so the whole file is sent", (header) => {
    expect(parseRange(header)).toBeUndefined();
  });
});

describe("answering a file download", () => {
  const files = createFiles({ compressVideo: async () => Buffer.from("compressed mp4") });
  const contents = new Uint8Array(1000).map((_, i) => i % 256);
  let ivan: Actor;
  let fileId: string;

  beforeEach(async () => {
    ivan = await createUser("Ivan");
    ({ id: fileId } = await uploadFile(ivan, { fileName: "Договор за доставка.pdf", contents }));
  });

  const download = async (actor: Actor | null, range: string | null = null, id = fileId) =>
    fileResponse(await files.read(actor, id, { range: parseRange(range) }));

  it("sends the whole file, and says it supports byte ranges", async () => {
    const response = await download(ivan);

    expect(response.status).toBe(200);
    expect(Object.fromEntries(response.headers)).toMatchObject({
      "accept-ranges": "bytes",
      "content-length": "1000",
      "content-type": "application/pdf",
      "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent("Договор за доставка.pdf")}`,
    });
    expect(response.headers.has("content-range")).toBe(false);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(contents);
  });

  it("answers a range request with 206 Partial Content and the range it sends", async () => {
    const response = await download(ivan, "bytes=100-199");

    expect(response.status).toBe(206);
    expect(Object.fromEntries(response.headers)).toMatchObject({
      "accept-ranges": "bytes",
      "content-range": "bytes 100-199/1000",
      "content-length": "100",
      "content-type": "application/pdf",
    });
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(contents.subarray(100, 200));
  });

  it("answers a range at the end of the file", async () => {
    const response = await download(ivan, "bytes=-10");

    expect(response.status).toBe(206);
    expect(response.headers.get("content-range")).toBe("bytes 990-999/1000");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(contents.subarray(990));
  });

  it("answers a range it can't satisfy with 416 and the file's size", async () => {
    const response = await download(ivan, "bytes=1000-");

    expect(response.status).toBe(416);
    expect(response.headers.get("content-range")).toBe("bytes */1000");
  });

  it("refuses without a signed-in user", async () => {
    expect((await download(null)).status).toBe(401);
    expect((await download(null, "bytes=0-1")).status).toBe(401);
  });

  it("reports a file that doesn't exist", async () => {
    expect((await download(ivan, null, "missing-file")).status).toBe(404);
  });

  it("asks proxies and compression not to change the bytes, so ranges stay right", async () => {
    const response = await download(ivan, "bytes=0-1");

    expect(response.headers.get("cache-control")).toBe("private, no-transform");
  });
});
