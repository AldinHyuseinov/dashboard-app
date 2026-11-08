"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { submitTaskAction } from "@/actions/task-actions";
import { getCategoryLabel, listCategorySections } from "@/lib/categories";
import { DOCUMENT_ACCEPT, MAX_FILES, MEDIA_ACCEPT, UPLOAD_ACCEPT } from "@/lib/constants";
import {
  FILE_KIND_LABEL,
  LIMITS_HINT,
  checkPicked,
  draftErrors,
  fileKind,
  fileSizeLabel,
  uploadStatus,
  type DraftErrors,
  type FileKind,
} from "@/lib/task-form";
import type { TaskFileMeta } from "@/lib/types";
import {
  CameraIcon,
  CheckIcon,
  CloseIcon,
  FileIcon,
  GalleryIcon,
  UploadIcon,
} from "@/components/shell/icons";
import { taskHref } from "@/lib/navigation";
import PickButton from "@/components/forms/PickButton";
import { uploadFile, videoDuration } from "./browser-files";

type Props =
  | {
      mode: "create";
      /** The Category already chosen, if any; on desktop it can still be changed. */
      category?: string;
      /** Whether the Category was chosen on New task's first step, rather than by posting from a Category. */
      secondStep: boolean;
      cancelHref: string;
    }
  | {
      mode: "edit";
      task: { id: string; title: string; description: string; category: string; files: TaskFileMeta[] };
    };

/** A file picked on this device, and its id once uploaded. */
type Attachment = { key: number; file: File; previewUrl: string; serverId?: string };

type Upload = { key: number; index: number; total: number; sent: number };

const FIELD =
  "w-full rounded-tile border border-line bg-surface px-2 py-1.5 text-body text-ink transition-colors placeholder:text-ink-2/70 focus:border-gold-ink focus-visible:outline-offset-0 aria-invalid:border-error";

/**
 * New task and Edit task. New task needs a Category: phones choose it on
 * the step before, desktop beside the form. Files are checked against the
 * limits as they're picked; on phones they come from the camera, the photo
 * library or documents. On submit, files are uploaded one at a time with
 * their progress shown, then the Task is saved. A new Task is confirmed
 * here; an edited one returns to its Task screen.
 */
export default function TaskForm(props: Props) {
  const editing = props.mode === "edit" ? props.task : null;
  const [state, formAction, isPending] = useActionState(submitTaskAction, {});

  const [category, setCategory] = useState(editing?.category ?? (props.mode === "create" ? props.category : "") ?? "");
  const [title, setTitle] = useState(editing?.title ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [fieldErrors, setFieldErrors] = useState<DraftErrors>({});

  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [upload, setUpload] = useState<Upload | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const nextKey = useRef(1);

  const keptFiles = editing?.files.filter((f) => !removedIds.includes(f.id)) ?? [];
  const fileCount = keptFiles.length + attachments.length;
  const room = MAX_FILES - fileCount;
  const busy = upload !== null || isPending;

  // Previews live as object URLs until the form goes away.
  const attachmentsRef = useRef(attachments);
  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);
  useEffect(() => () => attachmentsRef.current.forEach((a) => URL.revokeObjectURL(a.previewUrl)), []);

  const categoryLabel = getCategoryLabel(category);
  const serverErrors = state.errors;

  if (state.published) {
    return <Published title={state.published.title} href={state.published.href} categoryLabel={categoryLabel} />;
  }

  async function addFiles(picked: File[]) {
    if (picked.length === 0) return;
    const described = await Promise.all(
      picked.map(async (file) => ({
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        durationSeconds: fileKind(file.type, file.name) === "video" ? await videoDuration(file) : undefined,
      })),
    );
    const { accepted, errors } = checkPicked(described, { room });
    setFileErrors(errors);
    setAttachments((current) => [
      ...current,
      ...accepted.map(({ file }) => ({ key: nextKey.current++, file, previewUrl: URL.createObjectURL(file) })),
    ]);
  }

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files ?? []));
    e.target.value = ""; // So the same file can be picked again after removing it.
  };

  const removeAttachment = (key: number) => {
    setAttachments((current) => {
      const removed = current.find((a) => a.key === key);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((a) => a.key !== key);
    });
    setFileErrors([]);
  };

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;

    const errors = draftErrors({ category, title, description });
    setFieldErrors(errors);
    const firstInvalid = (["category", "title", "description"] as const).find((field) => errors[field]);
    if (firstInvalid) {
      document.getElementById(firstInvalid === "category" ? "category-fieldset" : firstInvalid)?.focus();
      return;
    }
    setFileErrors([]);

    // Files already uploaded on an earlier try aren't sent again.
    const uploaded = new Map(attachments.flatMap((a) => (a.serverId ? [[a.key, a.serverId] as const] : [])));
    const waiting = attachments.filter((a) => !a.serverId);
    for (const [index, attachment] of waiting.entries()) {
      setUpload({ key: attachment.key, index, total: waiting.length, sent: 0 });
      try {
        const id = await uploadFile(attachment.file, (sent) =>
          setUpload((current) => current && { ...current, sent }),
        );
        uploaded.set(attachment.key, id);
        setAttachments((current) => current.map((a) => (a.key === attachment.key ? { ...a, serverId: id } : a)));
      } catch (error) {
        setUpload(null);
        setFileErrors([`„${attachment.file.name}“ не беше качен. ${(error as Error).message}`]);
        return;
      }
    }
    setUpload(null);

    const formData = new FormData();
    formData.set("title", title);
    formData.set("description", description);
    if (editing) formData.set("taskId", editing.id);
    else formData.set("category", category);
    for (const attachment of attachments) formData.append("processedFileIds", uploaded.get(attachment.key)!);
    for (const id of removedIds) formData.append("deletedFileIds", id);
    startTransition(() => formAction(formData));
  }

  const clearError = (field: keyof DraftErrors) =>
    setFieldErrors((current) => {
      const rest = { ...current };
      delete rest[field];
      return rest;
    });
  const error = (field: "title" | "description") => fieldErrors[field] ?? serverErrors?.[field]?.[0];
  const submitLabel = upload
    ? "Качване…"
    : isPending
      ? editing
        ? "Запазване…"
        : "Публикуване…"
      : editing
        ? "Запази промените"
        : "Публикувай задачата";

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-3 lg:gap-4">
      <header className="flex flex-col gap-0.5">
        {editing ? (
          <p className="eyebrow text-ink-2">{categoryLabel}</p>
        ) : (
          categoryLabel && (
            <p className="eyebrow text-ink-2 lg:hidden">
              {props.mode === "create" && props.secondStep ? `Стъпка 2 от 2 · ${categoryLabel}` : categoryLabel}
            </p>
          )
        )}
        <h1 className="screen-title">{editing ? "Редактиране на задачата" : "Нова задача"}</h1>
      </header>

      {serverErrors?.form && (
        <p role="alert" className="rounded-tile border border-error bg-surface p-2 text-secondary font-semibold text-error">
          {serverErrors.form}
        </p>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-6">
        {!editing && (
          <CategoryFieldset
            value={category}
            error={fieldErrors.category}
            onChange={(slug) => {
              setCategory(slug);
              clearError("category");
            }}
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="title" className="text-secondary font-semibold">
              Заглавие
            </label>
            <input
              id="title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                clearError("title");
              }}
              placeholder="Напр. Доставка за събитие на 2.11"
              aria-invalid={error("title") ? true : undefined}
              aria-describedby={error("title") ? "title-error" : undefined}
              className={`${FIELD} min-h-6 py-0`}
            />
            {error("title") && (
              <p id="title-error" className="text-meta font-semibold text-error">
                {error("title")}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="description" className="text-secondary font-semibold">
              Описание
            </label>
            <textarea
              id="description"
              rows={5}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                clearError("description");
              }}
              placeholder="Какво трябва да се направи, до кога и от кого."
              aria-invalid={error("description") ? true : undefined}
              aria-describedby={error("description") ? "description-error" : undefined}
              className={`${FIELD} resize-y`}
            />
            {error("description") && (
              <p id="description-error" className="text-meta font-semibold text-error">
                {error("description")}
              </p>
            )}
          </div>

          <div role="group" aria-labelledby="files-label" className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-1">
              <span id="files-label" className="text-secondary font-semibold">
                Файлове
              </span>
              <span className="text-meta text-ink-2">
                {fileCount} от {MAX_FILES}
              </span>
            </div>

            {room > 0 ? (
              <>
                {/* Phones: the camera, the photo library, or documents. */}
                <div className="grid grid-cols-3 gap-1 lg:hidden">
                  <PickButton icon={<CameraIcon size={24} />} label="Камера" accept={MEDIA_ACCEPT} capture="environment" onPick={onPick} disabled={busy} />
                  <PickButton icon={<GalleryIcon size={24} />} label="Галерия" accept={MEDIA_ACCEPT} multiple onPick={onPick} disabled={busy} />
                  <PickButton icon={<FileIcon size={24} />} label="Документ" accept={DOCUMENT_ACCEPT} multiple onPick={onPick} disabled={busy} />
                </div>

                {/* Desktop: drop files in, or choose them. */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    if (!busy) addFiles(Array.from(e.dataTransfer.files));
                  }}
                  className={`hidden flex-wrap items-center justify-center gap-2 rounded-card border border-dashed px-3 py-4 text-center transition-colors lg:flex ${
                    dragOver ? "border-gold-ink bg-tint" : "border-line bg-surface"
                  }`}
                >
                  <UploadIcon size={28} className="text-gold-ink" />
                  <span className="text-secondary text-ink-2">Пуснете файлове тук или</span>
                  <label className="btn-ghost focus-within:outline-2 focus-within:outline-gold-ink has-disabled:cursor-not-allowed has-disabled:opacity-60">
                    <input type="file" multiple accept={UPLOAD_ACCEPT} onChange={onPick} disabled={busy} className="sr-only" />
                    Изберете файлове
                  </label>
                </div>
              </>
            ) : (
              <p className="rounded-tile border border-line bg-surface p-2 text-secondary text-ink-2">
                Задачата вече има {MAX_FILES} файла. Махнете някой, за да добавите друг.
              </p>
            )}

            <p className="text-meta text-ink-2">{LIMITS_HINT}</p>

            {(fileErrors.length > 0 || serverErrors?.files) && (
              <ul role="alert" className="flex flex-col gap-0.5 text-meta font-semibold text-error">
                {(fileErrors.length > 0 ? fileErrors : (serverErrors?.files ?? [])).map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            )}

            <p role="status" className="text-meta font-semibold text-gold-ink empty:hidden">
              {upload ? uploadStatus(upload) : ""}
            </p>

            {fileCount > 0 && (
              <ul className="grid grid-cols-3 gap-1 lg:grid-cols-1 lg:gap-0 lg:divide-y lg:divide-line lg:overflow-hidden lg:rounded-card lg:border lg:border-line lg:bg-surface">
                {keptFiles.map((file) => (
                  <FileTile
                    key={file.id}
                    name={file.fileName}
                    kind={fileKind(file.fileType, file.fileName)}
                    src={`/api/files/${file.id}`}
                    meta="запазен"
                    disabled={busy}
                    onRemove={() => setRemovedIds((ids) => [...ids, file.id])}
                  />
                ))}
                {attachments.map((a) => (
                  <FileTile
                    key={a.key}
                    name={a.file.name}
                    kind={fileKind(a.file.type, a.file.name)}
                    src={a.previewUrl}
                    meta={fileSizeLabel(a.file.size)}
                    sent={upload?.key === a.key ? upload.sent : undefined}
                    disabled={busy}
                    onRemove={() => removeAttachment(a.key)}
                  />
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-1 sm:flex-row">
            <button type="submit" disabled={busy} className="btn-gold disabled:cursor-progress">
              {submitLabel}
            </button>
            <Link
              href={props.mode === "edit" ? taskHref(props.task) : props.cancelHref}
              className="btn-ghost hidden lg:inline-flex"
            >
              Отказ
            </Link>
          </div>
        </div>
      </div>
    </form>
  );
}

/** Every Category to post into, Venues as a heading over its own. Desktop only: phones choose first. */
function CategoryFieldset({
  value,
  error,
  onChange,
}: {
  value: string;
  error?: string;
  onChange: (slug: string) => void;
}) {
  return (
    <fieldset
      id="category-fieldset"
      tabIndex={-1}
      aria-describedby={error ? "category-error" : undefined}
      className="hidden min-w-0 flex-col gap-2 rounded-card border border-line bg-surface px-1 py-2 lg:flex lg:w-[300px] lg:shrink-0"
    >
      <legend className="px-1 text-secondary font-semibold">Категория</legend>
      {listCategorySections().map((section) => (
        <div key={section.heading} className="flex flex-col gap-0.5">
          <span className="eyebrow px-2 text-ink-2">{section.heading}</span>
          {section.categories.map((c) => (
            <label
              key={c.slug}
              className="flex min-h-5 cursor-pointer items-center gap-2 rounded-tile px-2 text-secondary font-medium hover:bg-hover"
            >
              <input
                type="radio"
                name="category"
                value={c.slug}
                checked={value === c.slug}
                onChange={() => onChange(c.slug)}
                className="size-[18px] shrink-0 accent-gold-ink"
              />
              {c.label}
            </label>
          ))}
        </div>
      ))}
      {error && (
        <p id="category-error" role="alert" className="px-2 text-meta font-semibold text-error">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** One file on the form: a square tile on phones, a row on desktop. */
function FileTile({
  name,
  kind,
  src,
  meta,
  sent,
  disabled,
  onRemove,
}: {
  name: string;
  kind: FileKind;
  src: string;
  meta: string;
  /** How much of it has been uploaded, while it is. */
  sent?: number;
  disabled: boolean;
  onRemove: () => void;
}) {
  return (
    <li className="relative flex aspect-square items-center justify-center overflow-hidden rounded-tile bg-tint lg:aspect-auto lg:justify-start lg:gap-2 lg:rounded-none lg:bg-transparent lg:py-1 lg:pr-1 lg:pl-2">
      <span className="flex size-full items-center justify-center overflow-hidden text-gold-ink lg:size-5 lg:shrink-0 lg:rounded-tile lg:bg-tint">
        {kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element -- a local preview or a stored file
          <img src={src} alt="" className="size-full object-cover" />
        ) : kind === "video" ? (
          <video src={`${src}#t=0.1`} muted playsInline preload="metadata" className="size-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-0.5 p-1 text-center">
            <FileIcon size={22} />
            <span className="line-clamp-2 text-[11px] font-semibold break-all lg:hidden">{name}</span>
          </span>
        )}
      </span>

      <span className="hidden min-w-0 flex-1 flex-col lg:flex">
        <span className="truncate text-secondary font-semibold">{name}</span>
        <span className="text-label text-ink-2">
          {FILE_KIND_LABEL[kind]} · {meta}
        </span>
      </span>

      {sent !== undefined && (
        <span
          role="progressbar"
          aria-label={`Качване на ${name}`}
          aria-valuenow={Math.round(sent * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="absolute inset-x-1 bottom-1 h-0.5 overflow-hidden rounded-full bg-surface/70 lg:static lg:w-[96px] lg:bg-line"
        >
          <span className="block h-full rounded-full bg-gold transition-[width]" style={{ width: `${sent * 100}%` }} />
        </span>
      )}

      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Премахни ${name}`}
        className="absolute top-0 right-0 flex size-touch cursor-pointer items-start justify-end p-[6px] disabled:cursor-not-allowed disabled:opacity-50 lg:static lg:items-center lg:justify-center lg:rounded-tile lg:p-0 lg:text-ink-2 lg:hover:bg-hover lg:hover:text-ink"
      >
        <span className="flex size-3 items-center justify-center rounded-full bg-ink/75 text-surface lg:size-auto lg:bg-transparent lg:text-current">
          <CloseIcon size={14} className="lg:size-[18px]" />
        </span>
      </button>
    </li>
  );
}

/** Says a new Task was published, with the way to it and back to the Feed. */
function Published({ title, href, categoryLabel }: { title: string; href: string; categoryLabel?: string }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);

  return (
    <div className="flex max-w-[560px] flex-col gap-3 pt-3 lg:pt-6">
      <span className="flex size-8 items-center justify-center rounded-full bg-vine-tint text-vine">
        <CheckIcon size={32} />
      </span>
      <div className="flex flex-col gap-1">
        <h1 ref={headingRef} tabIndex={-1} className="screen-title outline-none">
          Задачата е публикувана
        </h1>
        <p className="text-body text-ink-2">
          „{title}“ е в категория {categoryLabel}. Екипът ще получи известие.
        </p>
      </div>
      <div className="flex flex-col gap-1 sm:flex-row">
        <Link href={href} className="btn-gold">
          Отвори задачата
        </Link>
        <Link href="/" className="btn-ghost">
          Към активността
        </Link>
      </div>
    </div>
  );
}
