"use client";

import { useRef, useState } from "react";

type FullscreenVideoElement = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitRequestFullscreen?: () => Promise<void> | void;
  mozRequestFullScreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
};

type FullscreenContainerElement = HTMLDivElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  mozRequestFullScreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function PlayIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M8 5.5v13l10-6.5-10-6.5Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M7 5h4v14H7V5Zm6 0h4v14h-4V5Z" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 7 6 12l5 5" />
      <path d="M18 7l-5 5 5 5" />
    </svg>
  );
}

function ForwardIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="m13 7 5 5-5 5" />
      <path d="m6 7 5 5-5 5" />
    </svg>
  );
}

function VolumeIcon({ muted }: { muted: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9v6h4l5 4V5L8 9H4Z" />
      {muted ? (
        <>
          <path d="m18 9-4 6" />
          <path d="m14 9 4 6" />
        </>
      ) : (
        <>
          <path d="M16 9.5a4 4 0 0 1 0 5" />
          <path d="M18.5 7a7.5 7.5 0 0 1 0 10" />
        </>
      )}
    </svg>
  );
}

function FullscreenIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H4a1 1 0 0 0-1 1v4" />
      <path d="M16 3h4a1 1 0 0 1 1 1v4" />
      <path d="M8 21H4a1 1 0 0 1-1-1v-4" />
      <path d="M16 21h4a1 1 0 0 0 1-1v-4" />
    </svg>
  );
}

export function ProtectedVideoPlayer({
  src,
  className = ""
}: {
  src: string;
  className?: string;
}) {
  const videoRef = useRef<FullscreenVideoElement>(null);
  const frameRef = useRef<FullscreenContainerElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [nativeControls, setNativeControls] = useState(false);

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
    const requestFullscreen =
      video?.requestFullscreen ||
      video?.webkitRequestFullscreen ||
      video?.mozRequestFullScreen ||
      video?.msRequestFullscreen ||
      frame?.requestFullscreen ||
      frame?.webkitRequestFullscreen ||
      frame?.mozRequestFullScreen ||
      frame?.msRequestFullscreen;
    const fullscreenTarget =
      video?.requestFullscreen ||
      video?.webkitRequestFullscreen ||
      video?.mozRequestFullScreen ||
      video?.msRequestFullscreen
        ? video
        : frame;

    if (video?.paused) {
      await video.play().catch(() => undefined);
    }

    if (requestFullscreen && fullscreenTarget) {
      try {
        await Promise.resolve(requestFullscreen.call(fullscreenTarget));
        return;
      } catch {
        setNativeControls(true);
      }
    }

    if (video?.webkitEnterFullscreen) {
      video.webkitEnterFullscreen();
      return;
    }

    setNativeControls(true);
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
        controls={nativeControls}
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

        <div className="flex items-center justify-between gap-2">
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => seekBy(-10)}
              aria-label="Назад на 10 секунд"
              title="Назад на 10 секунд"
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/[0.08] text-white transition hover:bg-white/[0.14]"
            >
              <BackIcon />
              <span className="absolute -bottom-1 right-0 rounded-full bg-black/70 px-1 text-[9px] leading-3 text-white/72">10</span>
            </button>
            <button
              type="button"
              onClick={togglePlayback}
              aria-label={playing ? "Пауза" : "Воспроизвести"}
              title={playing ? "Пауза" : "Воспроизвести"}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-950 transition hover:bg-white/90"
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button
              type="button"
              onClick={() => seekBy(10)}
              aria-label="Вперёд на 10 секунд"
              title="Вперёд на 10 секунд"
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/[0.08] text-white transition hover:bg-white/[0.14]"
            >
              <ForwardIcon />
              <span className="absolute -bottom-1 right-0 rounded-full bg-black/70 px-1 text-[9px] leading-3 text-white/72">10</span>
            </button>
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <button
              type="button"
              onClick={toggleMuted}
              aria-label={muted || volume === 0 ? "Включить звук" : "Выключить звук"}
              title={muted || volume === 0 ? "Включить звук" : "Выключить звук"}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.08] text-white transition hover:bg-white/[0.14]"
            >
              <VolumeIcon muted={muted || volume === 0} />
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={muted ? 0 : volume}
              onChange={(event) => handleVolume(event.currentTarget.value)}
              aria-label="Громкость"
              className="min-w-0 max-w-[5.5rem] flex-1 cursor-pointer accent-fuchsia-300 sm:max-w-[7rem]"
            />
            <button
              type="button"
              onClick={enterFullscreen}
              aria-label="Полный экран"
              title="Полный экран"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.08] text-white transition hover:bg-white/[0.14]"
            >
              <FullscreenIcon />
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
