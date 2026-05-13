import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: "var(--surface)",
        "surface-lowest": "var(--surface-container-lowest)",
        "surface-low": "var(--surface-container-low)",
        "surface-container": "var(--surface-container)",
        "surface-high": "var(--surface-container-high)",
        "surface-highest": "var(--surface-container-highest)",
        foreground: "var(--on-surface)",
        "foreground-variant": "var(--on-surface-variant)",
        muted: "var(--on-surface-muted)",
        primary: "var(--primary)",
        electric: "var(--electric)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        info: "var(--info)",
        border: "var(--outline-variant)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        label: ["var(--font-label)"],
      },
      boxShadow: {
        electric: "var(--shadow-electric-md)",
        "electric-lg": "var(--shadow-electric-lg)",
      },
      backgroundImage: {
        brand: "var(--gradient-brand)",
        atmosphere: "var(--gradient-atmosphere)",
      },
    },
  },
  plugins: [],
};

export default config;
