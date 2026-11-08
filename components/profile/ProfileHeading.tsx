"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeProfilePictureAction, setProfilePictureAction, type PictureResult } from "@/actions/profile-picture-actions";
import Avatar from "@/components/shell/Avatar";
import { CameraIcon, GalleryIcon, TrashIcon } from "@/components/shell/icons";
import { FormError, FormNotice } from "@/components/forms/FormMessage";
import PickButton from "@/components/forms/PickButton";
import { IMAGE_TYPES } from "@/lib/constants";
import { MAX_PICTURE_SIZE, pictureProblem } from "@/lib/profile-picture-rules";

/** What the pickers offer: the image types Task files take, so iPhones send HEIC photos as JPEG. */
const PICTURE_ACCEPT = IMAGE_TYPES.join(",");

const HINT = `JPEG, PNG, WebP или GIF до ${MAX_PICTURE_SIZE / (1024 * 1024)}MB. Снимката се изрязва в квадрат от средата.`;

type Message = { tone: "success" | "error"; text: string };

/**
 * The Profile's heading: the person's avatar, name and email, and "Смени
 * снимката", which opens the pickers. A chosen photo is previewed as it will
 * be shown (the centred square, in a circle) before it's saved. "Премахни
 * снимката" appears when there is a picture. Either change refreshes the page.
 */
export default function ProfileHeading({
  name,
  email,
  image,
}: {
  name: string;
  email: string;
  image: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  /** The photo chosen, and the address the browser previews it from. */
  const [chosen, setChosen] = useState<{ file: File; preview: string } | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [pending, startTransition] = useTransition();
  const preview = chosen?.preview;

  // Each preview's address is let go once another photo takes its place, or none does.
  useEffect(() => (chosen ? () => URL.revokeObjectURL(chosen.preview) : undefined), [chosen]);

  const close = () => {
    setOpen(false);
    setChosen(null);
  };

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Choosing the same photo again must still count as a choice.
    e.target.value = "";
    if (!file) return;
    const problem = pictureProblem(file);
    setMessage(problem ? { tone: "error", text: problem } : null);
    setChosen(problem ? null : { file, preview: URL.createObjectURL(file) });
  };

  const run = (change: () => Promise<PictureResult>, done: string) =>
    startTransition(async () => {
      setMessage(null);
      let result: PictureResult;
      try {
        result = await change();
      } catch {
        result = { ok: false, error: "Връзката прекъсна. Проверете интернета и опитайте отново." };
      }
      if (!result.ok) return setMessage({ tone: "error", text: result.error });
      close();
      setMessage({ tone: "success", text: done });
      router.refresh();
    });

  const save = () => {
    if (!chosen) return;
    const data = new FormData();
    data.append("picture", chosen.file);
    run(() => setProfilePictureAction(data), "Снимката е запазена.");
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Avatar name={name} image={image} size="lg" />
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate text-body font-semibold text-ink">{name}</p>
          <p className="truncate text-secondary text-ink-2">{email}</p>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => {
              setMessage(null);
              setOpen(true);
            }}
            className="btn-ghost basis-full sm:basis-auto"
          >
            <CameraIcon size={18} />
            Смени снимката
          </button>
        )}
      </div>

      {!open && message?.tone === "success" && <FormNotice tone="success">{message.text}</FormNotice>}

      {open && (
        <section
          aria-labelledby="picture-heading"
          className="flex flex-col gap-2 rounded-card border border-line bg-surface p-2 lg:max-w-75 lg:p-3"
        >
          <h2 id="picture-heading" className="eyebrow text-ink-2">
            Снимка на профила
          </h2>

          {message?.tone === "error" && <FormError>{message.text}</FormError>}

          {preview ? (
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- a local preview */}
              <img src={preview} alt="Новата снимка" className="size-16 shrink-0 rounded-full border border-line object-cover" />
              <p className="text-secondary text-ink-2">Така ще изглежда снимката ви.</p>
            </div>
          ) : (
            <p className="text-meta text-ink-2">{HINT}</p>
          )}

          {/* Phones: the camera or the photo library. */}
          <div className="grid grid-cols-2 gap-1 lg:hidden">
            <PickButton icon={<CameraIcon size={24} />} label="Камера" accept={PICTURE_ACCEPT} capture="user" onPick={pick} disabled={pending} />
            <PickButton icon={<GalleryIcon size={24} />} label={preview ? "Друга снимка" : "Галерия"} accept={PICTURE_ACCEPT} onPick={pick} disabled={pending} />
          </div>

          <div className="flex flex-wrap gap-1">
            {/* Desktop: one picker. */}
            <label className="btn-ghost hidden focus-within:outline-2 focus-within:outline-gold-ink has-disabled:cursor-not-allowed has-disabled:opacity-60 lg:inline-flex">
              <input type="file" accept={PICTURE_ACCEPT} onChange={pick} disabled={pending} className="sr-only" />
              <GalleryIcon size={18} />
              {preview ? "Друга снимка" : "Изберете снимка"}
            </label>
            {preview && (
              <button type="button" onClick={save} disabled={pending} className="btn-gold">
                {pending ? "Запазване…" : "Запази снимката"}
              </button>
            )}
            {image && !preview && (
              <button
                type="button"
                onClick={() => run(removeProfilePictureAction, "Снимката е премахната.")}
                disabled={pending}
                className="btn-ghost disabled:opacity-60"
              >
                <TrashIcon size={18} />
                {pending ? "Премахване…" : "Премахни снимката"}
              </button>
            )}
            <button type="button" onClick={close} disabled={pending} className="btn-ghost disabled:opacity-60">
              Отказ
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
