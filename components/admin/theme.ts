import { Tier } from "@/lib/types";

export const ADMIN_SHELL_CLASS =
  "bg-[linear-gradient(180deg,#14121b_0%,#100f17_42%,#0c0d13_100%)]";

export const ADMIN_HEADER_CLASS =
  "bg-[linear-gradient(180deg,rgba(34,31,44,0.96),rgba(25,23,33,0.94))] shadow-[0_12px_28px_rgba(0,0,0,0.18)]";

export const ADMIN_EYEBROW_CLASS = "text-white/55";

export const ADMIN_PANEL_CLASS =
  "relative overflow-hidden rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.02))] p-4 shadow-[0_12px_28px_rgba(0,0,0,0.14)] backdrop-blur-md sm:p-5";

export const ADMIN_PANEL_GLOW_CLASS =
  "pointer-events-none absolute inset-x-10 top-0 h-16 rounded-full bg-white/4 blur-3xl";

export const ADMIN_SUBPANEL_CLASS =
  "rounded-[22px] border border-white/8 bg-black/12 p-4 shadow-[0_10px_24px_rgba(0,0,0,0.12)]";

export const ADMIN_INPUT_CLASS =
  "w-full rounded-[18px] border border-white/10 bg-black/14 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-white/18 focus:bg-black/18";

export const ADMIN_TEXTAREA_CLASS = `${ADMIN_INPUT_CLASS} min-h-[140px]`;

export const ADMIN_SELECT_CLASS = ADMIN_INPUT_CLASS;

export const ADMIN_BUTTON_PRIMARY_CLASS =
  "rounded-[18px] bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white/92";

export const ADMIN_BUTTON_SECONDARY_CLASS =
  "rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-white/78 transition hover:border-white/16 hover:bg-white/[0.05] hover:text-white";

export const ADMIN_BUTTON_DANGER_CLASS =
  "rounded-[18px] border border-rose-200/14 bg-rose-500/8 px-4 py-3 text-sm font-medium text-rose-100 transition hover:bg-rose-500/12";

export const ADMIN_BADGE_CLASS =
  "inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/55";

export const ADMIN_SECTION_TITLE_CLASS = "font-display text-[1.55rem] font-semibold text-white";

export function getAdminTierTheme(tier: Tier) {
  if (tier === "tier_4") {
    return {
      card: "border-violet-300/16 bg-[radial-gradient(circle_at_top,rgba(130,82,242,0.16),transparent_24%),radial-gradient(circle_at_80%_16%,rgba(217,70,239,0.12),transparent_20%),linear-gradient(180deg,rgba(14,11,22,0.98),rgba(6,6,11,1))]",
      glow: "bg-violet-500/10",
      pill: "border-violet-300/24 bg-violet-400/12 text-violet-100",
      subtle: "border-violet-300/12 bg-violet-950/20"
    };
  }

  if (tier === "tier_3") {
    return {
      card: "border-amber-300/18 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.16),transparent_24%),radial-gradient(circle_at_78%_18%,rgba(249,115,22,0.12),transparent_22%),linear-gradient(180deg,rgba(34,22,11,0.98),rgba(14,10,8,1))]",
      glow: "bg-amber-400/10",
      pill: "border-amber-300/24 bg-amber-400/12 text-amber-100",
      subtle: "border-amber-300/12 bg-amber-950/16"
    };
  }

  if (tier === "tier_2") {
    return {
      card: "border-fuchsia-300/16 bg-[radial-gradient(circle_at_top,rgba(217,70,239,0.16),transparent_24%),radial-gradient(circle_at_80%_18%,rgba(244,114,182,0.12),transparent_22%),linear-gradient(180deg,rgba(27,13,33,0.98),rgba(11,9,18,1))]",
      glow: "bg-fuchsia-500/10",
      pill: "border-fuchsia-300/24 bg-fuchsia-400/12 text-fuchsia-100",
      subtle: "border-fuchsia-300/12 bg-fuchsia-950/16"
    };
  }

  return {
    card: "border-slate-200/14 bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.12),transparent_24%),radial-gradient(circle_at_80%_18%,rgba(96,165,250,0.1),transparent_22%),linear-gradient(180deg,rgba(18,22,30,0.98),rgba(9,12,17,1))]",
    glow: "bg-slate-300/8",
    pill: "border-slate-200/24 bg-slate-200/10 text-slate-100",
    subtle: "border-slate-200/12 bg-slate-950/22"
  };
}
