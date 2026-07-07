"use client";

import { useRef, useState } from "react";

type FullscreenVideoElement = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function ProtectedVideoPlayer({
  src,
  className = ""
}: {
  src: string;
  className?: string;
}) {
  const videoRef = useRef<FullscreenVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  function syncVideoState() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    setCurrentTime(video.currentTime || 0);
    setDuration(video.duration || 0);
    setPlaying(!video.paused);
    setMuted(video.muted);
    setVolume(video.volume);
  }

  async function togglePlayback() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (video.paused) {
      await video.play().catch(() => undefined);
    } else {
      video.pause();
    }

    syncVideoState();
  }

  function seekBy(seconds: number) {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.currentTime = Math.min(Math.max(video.currentTime + seconds, 0), video.duration || video.currentTime + seconds);
    syncVideoState();
  }

  function handleSeek(value: string) {
    const video = videoRef.current;
    const nextTime = Number(value);

    if (!video || Number.isNaN(nextTime)) {
      return;
    }

    video.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  function handleVolume(value: string) {
    const video = videoRef.current;
    const nextVolume = Math.min(Math.max(Number(value), 0), 1);

    if (!video || Number.isNaN(nextVolume)) {
      return;
    }

    video.volume = nextVolume;
    video.muted = nextVolume === 0;
    setVolume(nextVolume);
    setMuted(video.muted);
  }

  function toggleMuted() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.muted = !video.muted;
    setMuted(video.muted);
  }

  async function enterFullscreen() {
    const frame = frameRef.current;
    const video = videoRef.current;

    if (frame?.requestFullscreen) {
      await frame.requestFullscreen().catch(() => undefined);
      return;
    }

    video?.webkitEnterFullscreen?.();
  }

  return (
    <div
      ref={frameRef}
      className={`protected-media overflow-hidden rounded-[28px] border border-white/10 bg-black shadow-glow ${className}`}
    >
      <video
        ref={videoRef}
        playsInline
        preload="metadata"
        controls={false}
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        src={src}
        className="w-full bg-black"
        onLoadedMetadata={syncVideoState}
        onTimeUpdate={syncVideoState}
        onPlay={syncVideoState}
        onPause={syncVideoState}
        onEnded={syncVideoState}
        onVolumeChange={syncVideoState}
        onClick={togglePlayback}
        onContextMenu={(event) => event.preventDefault()}
      />

      <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.88))] px-3 pb-3 pt-14">
        <div className="mb-3">
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={currentTime}
            onChange={(event) => handleSeek(event.currentTarget.value)}
            aria-label="Прогресс просмотра"
            className="h-2 w-full cursor-pointer accent-fuchsia-300"
            style={{
              background: `linear-gradient(90deg, #f0abfc ${progress}%, rgba(255,255,255,0.24) ${progress}%)`
            }}
          />
          <div className="mt-1 flex justify-between text-[11px] text-white/60">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => seekBy(-10)}
              className="rounded-full border border-white/12 bg-white/[0.08] px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/[0.14]"
            >
              -10с
            </button>
            <button
              type="button"
              onClick={togglePlayback}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white/90"
            >
              {playing ? "Пауза" : "Плей"}
            </button>
            <button
              type="button"
              onClick={() => seekBy(10)}
              className="rounded-full border border-white/12 bg-white/[0.08] px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/[0.14]"
            >
              +10с
            </button>
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-none">
            <button
              type="button"
              onClick={toggleMuted}
              className="rounded-full border border-white/12 bg-white/[0.08] px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/[0.14]"
            >
              {muted || volume === 0 ? "Звук выкл." : "Звук"}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={muted ? 0 : volume}
              onChange={(event) => handleVolume(event.currentTarget.value)}
              aria-label="Громкость"
              className="w-20 cursor-pointer accent-fuchsia-300 sm:w-28"
            />
            <button
              type="button"
              onClick={enterFullscreen}
              className="rounded-full border border-white/12 bg-white/[0.08] px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/[0.14]"
            >
              Полный экран
            </button>
          </div>
        </div>

        <div className="mt-2 text-center text-[10px] uppercase tracking-[0.14em] text-white/38">
          Закрытый материал
        </div>
      </div>
    </div>
  );
}
