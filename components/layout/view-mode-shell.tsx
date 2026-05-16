"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "lumina-view-mode";
const DESKTOP_WIDTH = 1280;
const MOBILE_WIDTH = 390;
const MOBILE_BREAKPOINT = 767;

type ViewMode = "desktop" | "mobile";

function buildPreviewSrc() {
  if (typeof window === "undefined") {
    return "";
  }

  const params = new URLSearchParams(window.location.search);
  params.set("previewEmbed", "1");

  const query = params.toString();
  return `${window.location.pathname}${query ? `?${query}` : ""}`;
}

export function ViewModeShell({ children }: { children: ReactNode }) {
  const isProduction = process.env.NODE_ENV === "production";

  const hostRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") {
      return "desktop";
    }

    const savedMode = window.localStorage.getItem(STORAGE_KEY);
    if (savedMode === "desktop" || savedMode === "mobile") {
      return savedMode;
    }

    return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches ? "mobile" : "desktop";
  });
  const [isEmbed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return new URLSearchParams(window.location.search).get("previewEmbed") === "1";
  });
  const [isPhysicalMobile, setIsPhysicalMobile] = useState(false);
  const [scale, setScale] = useState(1);
  const [frameWidth, setFrameWidth] = useState<number>();
  const [frameHeight, setFrameHeight] = useState<number>();
  const [iframeSrc, setIframeSrc] = useState(() => buildPreviewSrc());

  useEffect(() => {
    if (isProduction || isEmbed) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [isEmbed, isProduction, mode]);

  useEffect(() => {
    if (isProduction || isEmbed || !hostRef.current) {
      return;
    }

    const updateMetrics = () => {
      if (!hostRef.current) {
        return;
      }

      const hostWidth = hostRef.current.clientWidth;
      const nextIsPhysicalMobile = window.innerWidth <= MOBILE_BREAKPOINT;
      const previewWidth = mode === "mobile" ? MOBILE_WIDTH : DESKTOP_WIDTH;
      const availableWidth = Math.max(hostWidth - 24, 280);
      const nextScale = Math.min(1, availableWidth / previewWidth);
      const minHeight = mode === "mobile" ? 780 : 720;
      const viewportHeight = Math.max(window.innerHeight - 148, minHeight);

      setIsPhysicalMobile(nextIsPhysicalMobile);
      setScale(nextScale);
      setFrameWidth(Math.ceil(previewWidth * nextScale));
      setFrameHeight(Math.ceil(viewportHeight * nextScale));
      setIframeSrc(buildPreviewSrc());
    };

    updateMetrics();

    const resizeObserver = new ResizeObserver(updateMetrics);
    resizeObserver.observe(hostRef.current);
    window.addEventListener("resize", updateMetrics);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateMetrics);
    };
  }, [isEmbed, isProduction, mode]);

  if (isProduction || isEmbed) {
    return <>{children}</>;
  }

  const shouldShowLivePage =
    (mode === "mobile" && isPhysicalMobile) || (mode === "desktop" && !isPhysicalMobile);

  const previewWidth = mode === "mobile" ? MOBILE_WIDTH : DESKTOP_WIDTH;

  return (
    <div ref={hostRef} className="pb-8">
      <div className="sticky top-0 z-50 border-b border-white/10 bg-[#090912]/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.26em] text-white/45">Режим предпросмотра</p>
            <p className="mt-1 text-sm text-white/66">
              Можно принудительно смотреть страницу как на телефоне или как на ПК.
            </p>
          </div>

          <div className="inline-flex w-full rounded-[1.15rem] border border-white/10 bg-white/[0.04] p-1.5 md:w-auto">
            <button
              type="button"
              onClick={() => setMode("mobile")}
              className={`flex-1 rounded-[0.95rem] px-4 py-2 text-sm font-medium transition md:flex-none ${
                mode === "mobile"
                  ? "bg-accent text-white shadow-[0_0_24px_rgba(255,79,216,0.28)]"
                  : "text-white/58 hover:text-white"
              }`}
            >
              Мобилка
            </button>
            <button
              type="button"
              onClick={() => setMode("desktop")}
              className={`flex-1 rounded-[0.95rem] px-4 py-2 text-sm font-medium transition md:flex-none ${
                mode === "desktop"
                  ? "bg-accent text-white shadow-[0_0_24px_rgba(255,79,216,0.28)]"
                  : "text-white/58 hover:text-white"
              }`}
            >
              ПК
            </button>
          </div>
        </div>
      </div>

      <div className="px-3 pt-4 sm:px-4 sm:pt-5">
        {shouldShowLivePage ? (
          children
        ) : (
          <div
            className={`mx-auto overflow-hidden border border-white/10 bg-[#07070d] shadow-[0_24px_80px_rgba(0,0,0,0.38)] ${
              mode === "mobile" ? "rounded-[2rem]" : "rounded-[2.2rem]"
            }`}
            style={{
              width: frameWidth ? `${frameWidth}px` : undefined,
              maxWidth: "100%",
              height: frameHeight ? `${frameHeight}px` : undefined
            }}
          >
            <iframe
              key={`${mode}-${iframeSrc}`}
              src={iframeSrc}
              title={`Lumina ${mode} preview`}
              className="block border-0"
              style={{
                width: `${previewWidth}px`,
                height: `${frameHeight ? Math.ceil(frameHeight / Math.max(scale, 0.001)) : 0}px`,
                transform: `scale(${scale})`,
                transformOrigin: "top left"
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
