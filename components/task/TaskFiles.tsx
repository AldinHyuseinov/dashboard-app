import { FILE_KIND_LABEL, fileKind } from "@/lib/task-form";
import type { TaskFileMeta } from "@/lib/types";
import { FileIcon } from "@/components/shell/icons";

const isMedia = (file: TaskFileMeta) => {
  const kind = fileKind(file.fileType, file.fileName);
  return kind === "image" || kind === "video";
};

/**
 * A Task's files: images open full size, videos play in place and can be
 * skipped through (they're fetched in byte ranges as they play), and other
 * files open or download. Pictures and videos come first. On phones other
 * files are rows beneath them; on desktop every file is a tile.
 */
export default function TaskFiles({ files }: { files: readonly TaskFileMeta[] }) {
  if (files.length === 0) return null;
  const ordered = [...files.filter(isMedia), ...files.filter((file) => !isMedia(file))];

  return (
    <section aria-label="Прикачени файлове">
      <ul className="grid grid-cols-2 gap-1 lg:grid-cols-3 lg:gap-2">
        {ordered.map((file) => {
          const href = `/api/files/${file.id}`;
          const kind = fileKind(file.fileType, file.fileName);

          if (kind === "image") {
            return (
              <li key={file.id}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-4/3 overflow-hidden rounded-tile bg-tint"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- served from the database */}
                  <img
                    src={href}
                    alt={`Снимка: ${file.fileName}`}
                    loading="lazy"
                    className="size-full object-cover transition-transform hover:scale-[1.02]"
                  />
                </a>
              </li>
            );
          }

          if (kind === "video") {
            return (
              // On phones a video takes the full width, so its controls are easy to use.
              <li key={file.id} className="col-span-2 lg:col-span-1">
                {/* #t=0.1 makes iPhones show the first frame before playing. */}
                <video
                  src={`${href}#t=0.1`}
                  controls
                  playsInline
                  preload="metadata"
                  aria-label={`Видео: ${file.fileName}`}
                  className="block aspect-4/3 w-full rounded-tile bg-black object-contain"
                />
              </li>
            );
          }

          return (
            <li key={file.id} className="col-span-2 lg:col-span-1">
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-7 items-center gap-2 rounded-tile border border-line bg-surface px-2 py-1 transition-colors hover:bg-hover lg:aspect-4/3 lg:flex-col lg:items-start lg:justify-between lg:p-2"
              >
                <FileIcon size={28} className="shrink-0 text-gold-ink" />
                <span className="flex min-w-0 flex-col">
                  <span className="text-secondary font-semibold break-all">{file.fileName}</span>
                  <span className="text-label text-ink-2">{FILE_KIND_LABEL[kind]}</span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
