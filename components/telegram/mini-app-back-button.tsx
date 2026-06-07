"use client";

export function MiniAppBackButton({
  fallbackHref = "/tg/content",
  label = "Назад"
}: {
  fallbackHref?: string;
  label?: string;
}) {
  function handleBack() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.assign(fallbackHref);
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/82 transition hover:border-accent/35 hover:bg-white/10 hover:text-white"
    >
      <span aria-hidden="true">←</span>
      <span>{label}</span>
    </button>
  );
}
