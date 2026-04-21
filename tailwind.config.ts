import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#07070d",
        surface: "#10111a",
        panel: "#171927",
        border: "#2b2f45",
        accent: "#ff4fd8",
        accentSoft: "#ff9eee",
        cyanGlow: "#78e7ff",
        goldSoft: "#ffe2a8"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,79,216,0.12), 0 12px 50px rgba(255,79,216,0.18)",
        cyan: "0 10px 40px rgba(120,231,255,0.12)"
      },
      backgroundImage: {
        hero: "radial-gradient(circle at top, rgba(255,79,216,0.18), transparent 35%), radial-gradient(circle at 20% 20%, rgba(120,231,255,0.12), transparent 25%), linear-gradient(180deg, #090910 0%, #07070d 100%)"
      }
    }
  },
  plugins: []
};

export default config;
