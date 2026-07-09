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
  const isVideo = file.fileType.startsWith("video/");
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
        ) : isVideo ? (
          /* Render looping, muted video preview */
          <video src={fileUrl} muted loop playsInline autoPlay className="w-full object-cover" />
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
  const isVideo = file.type.startsWith("video/"); // Detect video

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
        ) : isVideo && previewUrl ? (
          /* Render looping, muted video preview for local files */
          <video
            src={previewUrl}
            muted
            loop
            playsInline
            autoPlay
            className="object-cover w-full opacity-90"
          />
        ) : (
          <PdfPreview fileName={file.name} />
        )}
      </a>
    </div>
  );
};

const PdfPreview = (props: { fileName: string }) => {
  return (
    <div className="flex items-center justify-center p-1 text-center min-w-15 cursor-pointer">
      <span className="text-2xl">📄</span>
      <span className="text-[10px] text-gray-600 px-1">{props.fileName}</span>
    </div>
  );
};

export const PdfPreviewLarge = (props: { fileName: string; styleCondition: boolean }) => {
  return (
    <div
      className={`w-16 h-16 border rounded-md flex flex-col items-center justify-between p-1 bg-red-50/30 transition-all select-none ${
        props.styleCondition
          ? "border-gray-200 opacity-50 grayscale"
          : "border-gray-200 hover:border-red-500 hover:scale-105"
      }`}
    >
      <span className="bg-red-600 text-white font-black text-[8px] px-1 rounded-sm uppercase tracking-wider leading-normal">
        PDF
      </span>
      <span className="text-5xl leading-none">📄</span>
      <span
        className={`text-[16px] font-medium truncate w-full text-center px-0.5 ${props.styleCondition ? "text-gray-400" : "text-gray-500"}`}
      >
        {props.fileName}
      </span>
    </div>
  );
};
