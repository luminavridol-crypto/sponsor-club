"use client";

import Image from "next/image";
import { ProtectedVideoPlayer } from "@/components/posts/protected-video-player";

type ProtectedMediaProps = {
  src: string;
  alt: string;
  kind: "image" | "video" | "audio";
  className?: string;
};

export function ProtectedMedia({
  src,
  alt,
  kind,
  className = ""
}: ProtectedMediaProps) {
  if (kind === "video") {
    return <ProtectedVideoPlayer src={src} className={className} />;
  }

  if (kind === "audio") {
    return (
      <div className={`rounded-[24px] border border-white/10 bg-white/[0.04] p-4 ${className}`}>
        <p className="mb-3 text-xs uppercase tracking-[0.18em] text-white/45">Голосовая запись</p>
        <audio src={src} controls preload="metadata" className="w-full" />
      </div>
    );
  }

  return (
    <div className={`protected-media ${className}`}>
      <Image
        src={src}
        alt={alt}
        width={1600}
        height={1200}
        unoptimized
        draggable={false}
        className="w-full rounded-[28px] border border-white/10 object-cover select-none"
        onContextMenu={(event) => event.preventDefault()}
      />
      <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-2xl bg-black/45 px-3 py-2 text-xs tracking-[0.12em] text-white/75 backdrop-blur">
        Закрытый материал Lumina Club
      </div>
    </div>
  );
}
