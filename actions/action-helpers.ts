import { Prisma } from "@/generated/prisma/client";
import { ProcessFilesResult } from "@/lib/types";
import sharp from "sharp";

export async function processAndCompressFiles(
  rawFiles: File[],
  maxFileSize: number,
  maxFilesCount: number,
): Promise<ProcessFilesResult> {
  // 1. Validate max file size
  if (rawFiles.some((f) => f.size > maxFileSize)) {
    const mbSize = Math.round(maxFileSize / (1024 * 1024));
    return { errors: { files: [`Не можете да прикачите файл по-голям от ${mbSize}MB.`] } };
  }

  // 2. Filter empty files
  const validFiles = rawFiles.filter((f) => f.size > 0 && f.size <= maxFileSize);

  // 3. Validate file count limit
  if (validFiles.length > maxFilesCount) {
    return { errors: { files: [`Можете да прикачите максимум ${maxFilesCount} файла.`] } };
  }

  // 4. Process and compress
  const processedFiles: Prisma.TaskFileCreateWithoutTaskInput[] = [];

  for (const file of validFiles) {
    const arrayBuffer = await file.arrayBuffer();

    let buffer = Buffer.from(arrayBuffer as ArrayBuffer);
    let finalFileType = file.type;

    if (file.type.startsWith("image/")) {
      try {
        const compressedBuffer = await sharp(buffer)
          .resize({ width: 1280, withoutEnlargement: true })
          .webp({ quality: 75 })
          .toBuffer();

        buffer = Buffer.from(compressedBuffer);
        finalFileType = "image/webp";
      } catch (error) {
        console.log("Failed to compress image:", error);
      }
    }

    processedFiles.push({
      fileName: file.name,
      fileType: finalFileType,
      data: buffer,
    });
  }

  return { processedFiles };
}
