import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import sharp from "sharp";
import { Prisma } from "@/generated/prisma/client";
import { MAX_FILE_SIZE } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "Няма избран файл." }, { status: 400 });
  }

  // 1. Specific file size check with Bulgarian message
  if (file.size > MAX_FILE_SIZE) {
    const sizeInMB = MAX_FILE_SIZE / (1024 * 1024);
    return NextResponse.json(
      { error: `Файлът "${file.name}" е твърде голям. Максималният размер е ${sizeInMB}MB.` },
      { status: 400 },
    );
  }

  // 1. Get the raw bytes from the file
  const arrayBuffer = await file.arrayBuffer();

  let buffer = Buffer.from(arrayBuffer as ArrayBuffer);
  let finalFileType = file.type;

  // 2. Process with Sharp if it's an image
  if (file.type.startsWith("image/")) {
    try {
      const compressedBuffer = await sharp(buffer)
        .resize({ width: 1280, withoutEnlargement: true })
        .webp({ quality: 75 })
        .toBuffer();

      // Sharp returns a Buffer, so we can assign it directly
      buffer = Buffer.from(compressedBuffer);
      finalFileType = "image/webp";
    } catch (error) {
      console.log("Failed to compress image:", error);
      // If compression fails, we keep the original buffer/type
    }
  }

  // 3. Construct the database object directly
  const fileData: Prisma.TaskFileCreateWithoutTaskInput = {
    fileName: file.name,
    fileType: finalFileType,
    data: buffer,
  };

  // Create an "orphaned" file record
  const savedFile = await prisma.taskFile.create({
    data: fileData,
    select: { id: true },
  });

  return NextResponse.json({ id: savedFile.id });
}
