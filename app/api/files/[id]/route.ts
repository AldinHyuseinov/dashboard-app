import { getActor } from "@/lib/session";
import { files } from "@/lib/files";
import { fileResponse, parseRange } from "@/lib/file-response";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const result = await files.read(await getActor(), id, {
    range: parseRange(request.headers.get("range")),
  });
  return fileResponse(result);
}
