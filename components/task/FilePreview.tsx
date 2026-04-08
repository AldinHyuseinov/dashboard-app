"use client";

import { FileMeta } from "@/lib/types";

export const ExistingFilePreview = ({
  file,
  onRemove,
}: {
  file: FileMeta;
  onRemove: (id: string) => void;
}) => {
  const isImage = file.fileType.startsWith("image/");
  const fileUrl = `/api/files/${file.id}`;

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          onRemove(file.id);
        }}
        className="absolute top-0 left-0 -translate-x-1 -translate-y-1 z-20 w-2 h-2 cursor-pointer text-xs font-bold text-red-500 p-1"
        title="Премахни"
      >
        ✕
      </button>

      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full border rounded-md border-gray-200 hover:border-primary-gold"
        title="Отвори файла"
      >
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fileUrl} alt={file.fileName} className="w-full object-cover" />
        ) : (
          <PdfPreview fileName={file.fileName} />
        )}
      </a>
    </div>
  );
};

export const LocalFilePreview = ({
  file,
  previewUrl,
  onRemove,
}: {
  file: File;
  previewUrl: string | null;
  onRemove: () => void;
}) => {
  const isImage = file.type.startsWith("image/");

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          onRemove();
        }}
        className="absolute top-0 left-0 -translate-x-1 -translate-y-1 z-20 w-2 h-2 cursor-pointer text-xs font-bold text-red-500 p-1"
        title="Откажи"
      >
        ✕
      </button>

      <a
        href={previewUrl || "#"}
        target={previewUrl ? "_blank" : undefined}
        rel="noopener noreferrer"
        className="block w-full border rounded-md border-gray-200 hover:border-primary-gold"
        title="Отвори файла"
      >
        {isImage && previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt={file.name} className="object-cover w-full opacity-90" />
        ) : (
          <PdfPreview fileName={file.name} />
        )}
      </a>
    </div>
  );
};

const PdfPreview = (props: { fileName: string }) => {
  return (
    <div className="flex items-center justify-center p-1 text-center max-w-15 cursor-pointer">
      <span className="text-2xl">📄</span>
      <span className="text-[10px] text-gray-600 px-1">{props.fileName}</span>
    </div>
  );
};
