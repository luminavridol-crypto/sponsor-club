"use client";

type ProtectedMediaProps = {
  src: string;
  alt: string;
  kind: "image" | "video";
  className?: string;
};

export function ProtectedMedia({
  src,
  alt,
  kind,
  className = ""
}: ProtectedMediaProps) {
  if (kind === "video") {
    return (
      <div className={`protected-media ${className}`}>
        <video
          controls
          controlsList="nodownload noplaybackrate"
          disablePictureInPicture
          preload="metadata"
          className="w-full rounded-[28px] border border-white/10 bg-black"
          src={src}
          onContextMenu={(event) => event.preventDefault()}
        />
        <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-2xl bg-black/45 px-3 py-2 text-xs tracking-[0.12em] text-white/75 backdrop-blur">
          Закрытый материал. Скачивание отключено.
        </div>
      </div>
    );
  }

  return (
    <div className={`protected-media ${className}`}>
      <img
        src={src}
        alt={alt}
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
