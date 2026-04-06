import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Find the file in the database
  const file = await prisma.taskFile.findUnique({
    where: { id },
    select: { data: true, fileType: true, fileName: true },
  });

  if (!file) return new NextResponse("File not found", { status: 404 });

  // 1. Encode the filename to handle Bulgarian/Cyrillic characters safely
  const encodedFileName = encodeURIComponent(file.fileName);

  // Return the raw binary data with the correct content type
  return new NextResponse(file.data, {
    headers: {
      "Content-Type": file.fileType,
      // 2. Use the UTF-8 filename* syntax for HTTP headers
      "Content-Disposition": `inline; filename*=UTF-8''${encodedFileName}`,
    },
  });
}
