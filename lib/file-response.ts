import type { RangeRequest, ReadResult } from "@/lib/files";

/**
 * The single byte range a `Range` header asks for, such as `bytes=0-1`,
 * `bytes=500-` or `bytes=-500`. Anything else, including several ranges at
 * once, is ignored (undefined), and the whole file is sent, as HTTP allows.
 */
export function parseRange(header: string | null): RangeRequest | undefined {
  const match = header?.trim().match(/^bytes=(\d*)-(\d*)$/i);
  if (!match) return undefined;
  const [, start, end] = match;

  if (start === "") return end === "" ? undefined : { suffix: Number(end) };
  if (end === "") return { start: Number(start) };
  if (Number(end) < Number(start)) return undefined;
  return { start: Number(start), end: Number(end) };
}

/**
 * The HTTP answer to a file download: the whole file (200), the range asked
 * for (206 Partial Content), or 416 when the range is outside the file.
 * Ranges let video start quickly and be skipped through; iPhones won't play
 * video without them.
 */
export function fileResponse(result: ReadResult): Response {
  if (!result.ok) {
    switch (result.reason) {
      case "unauthenticated":
        return new Response("Unauthorized", { status: 401 });
      case "not-found":
        return new Response("File not found", { status: 404 });
      case "unsatisfiable":
        return new Response(null, {
          status: 416,
          headers: { "Accept-Ranges": "bytes", "Content-Range": `bytes */${result.size}` },
        });
    }
  }

  const { file, range, body } = result;
  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Content-Type": file.fileType,
    // RFC 5987 UTF-8 filename, so Bulgarian (Cyrillic) names survive.
    "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
    // Compressing the response would make Content-Range and Content-Length wrong.
    "Cache-Control": "private, no-transform",
  });

  if (!range) {
    headers.set("Content-Length", String(file.size));
    return new Response(body, { status: 200, headers });
  }

  headers.set("Content-Length", String(range.end - range.start + 1));
  headers.set("Content-Range", `bytes ${range.start}-${range.end}/${file.size}`);
  return new Response(body, { status: 206, headers });
}
