import { NextResponse } from "next/server";
import { getActor } from "@/lib/session";
import { files } from "@/lib/files";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const result = await files.download(await getActor(), id);
  if (!result.ok) {
    return result.reason === "unauthenticated"
      ? new NextResponse("Unauthorized", { status: 401 })
      : new NextResponse("File not found", { status: 404 });
  }

  const { data, fileType, fileName } = result.file;
  return new NextResponse(data, {
    headers: {
      "Content-Type": fileType,
      // RFC 5987 UTF-8 filename, so Bulgarian (Cyrillic) names survive.
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}
