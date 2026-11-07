import { NextRequest, NextResponse } from "next/server";
import { getActor } from "@/lib/session";
import { files } from "@/lib/files";

const STATUS = { invalid: 400, "processing-failed": 500 } as const;

export async function POST(req: NextRequest) {
  // Refuse before reading the body, so no one without a session can make
  // the server receive and parse a large upload.
  const actor = await getActor();
  if (!actor) return new NextResponse("Unauthorized", { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file");

  const result = await files.upload(actor, {
    file: file instanceof File ? file : null,
    now: new Date(),
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: STATUS[result.reason] });

  return NextResponse.json({ id: result.file.id });
}
