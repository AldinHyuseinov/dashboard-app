import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

export async function compressVideo(buffer: Buffer): Promise<Buffer> {
  const tempInput = path.join(os.tmpdir(), `input-${Date.now()}.mp4`);
  const tempOutput = path.join(os.tmpdir(), `output-${Date.now()}.mp4`);

  // Write the file to the OS temp directory
  await fs.writeFile(tempInput, buffer);

  return new Promise<Buffer>((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-y",
      "-i",
      tempInput,
      "-t",
      "300", // 5 minutes limit in seconds
      "-c:v",
      "libx264",
      "-c:a",
      "aac",
      "-vf",
      "scale='trunc(iw*min(1,min(1920/iw,1080/ih))/2)*2':'trunc(ih*min(1,min(1920/iw,1080/ih))/2)*2'",
      "-crf",
      "28",
      "-preset",
      "faster",
      "-movflags",
      "+faststart",
      tempOutput,
    ]);

    // Handle successful completion
    ffmpeg.on("close", async (code) => {
      if (code === 0) {
        try {
          const compressedBuffer = await fs.readFile(tempOutput);
          // Clean up temp files
          await fs.unlink(tempInput).catch(() => {});
          await fs.unlink(tempOutput).catch(() => {});
          resolve(compressedBuffer);
        } catch (err) {
          reject(err);
        }
      } else {
        reject(new Error(`FFmpeg exited with error code ${code}`));
      }
    });

    // Handle process level errors
    ffmpeg.on("error", async (err) => {
      // Clean up temp files on failure
      await fs.unlink(tempInput).catch(() => {});
      await fs.unlink(tempOutput).catch(() => {});
      reject(err);
    });
  });
}
