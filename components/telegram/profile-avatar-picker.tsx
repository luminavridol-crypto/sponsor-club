"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export function ProfileAvatarPicker({
  currentAvatarUrl,
  fallbackLetter,
  className = ""
}: {
  currentAvatarUrl: string | null;
  fallbackLetter: string;
  className?: string;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className={`rounded-[24px] border px-4 py-4 ${className}`}>
      <div className="flex items-center gap-4">
        {previewUrl || currentAvatarUrl ? (
          <Image
            src={previewUrl || currentAvatarUrl || ""}
            alt="Аватар профиля"
            width={88}
            height={88}
            unoptimized
            className="h-[88px] w-[88px] rounded-full border border-white/10 object-cover shadow-[0_10px_28px_rgba(0,0,0,0.24)]"
          />
        ) : (
          <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full border border-white/10 bg-white/10 text-3xl font-semibold text-white shadow-[0_10px_28px_rgba(0,0,0,0.24)]">
            {fallbackLetter}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white">Аватар профиля</p>
          <p className="mt-1 text-sm leading-6 text-white/55">
            Выбери фото, затем нажми «Сохранить». Новая аватарка сразу заменит текущую.
          </p>
        </div>
      </div>

      <label className="mt-4 flex cursor-pointer items-center justify-center rounded-[18px] border border-dashed border-white/14 bg-white/[0.03] px-4 py-3 text-sm font-medium text-white/78 transition hover:border-white/22 hover:bg-white/[0.06] hover:text-white">
        <input
          name="avatar"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];

            setPreviewUrl((current) => {
              if (current) {
                URL.revokeObjectURL(current);
              }

              return file ? URL.createObjectURL(file) : null;
            });
          }}
        />
        {previewUrl ? "Выбрать другое фото" : "Выбрать фото"}
      </label>
    </div>
  );
}
