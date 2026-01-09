import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Polished Dark Mode Backgrounds
        "bg-primary": "#0a0a0a",
        "bg-secondary": "#111111",
        "bg-tertiary": "#1a1a1a",
        "border-primary": "#1f1f1f",
        "border-secondary": "#2a2a2a",
        
        // Override gray scale for better dark mode
        gray: {
          50: "#fafafa",
          100: "#f5f5f5",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3", // WCAG AA compliant on dark bg
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          850: "#1a1a1a",
          900: "#171717",
          925: "#111111",
          950: "#0a0a0a",
        },
        
        // Brand colors with better dark mode support
        primary: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981", // Main emerald
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
          950: "#022c22",
        },
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        glow: {
          "0%, 100%": { boxShadow: "0 0 20px 0 rgba(16, 185, 129, 0.3)" },
          "50%": { boxShadow: "0 0 30px 0 rgba(16, 185, 129, 0.5)" },
        },
      },
      animation: {
        shimmer: "shimmer 2s ease-in-out infinite",
        glow: "glow 2s ease-in-out infinite",
      },
      boxShadow: {
        "glow-sm": "0 0 10px 0 rgba(16, 185, 129, 0.2)",
        "glow-md": "0 0 20px 0 rgba(16, 185, 129, 0.3)",
        "glow-lg": "0 0 30px 0 rgba(16, 185, 129, 0.4)",
        "glow-danger": "0 0 20px 0 rgba(239, 68, 68, 0.3)",
        "glow-warning": "0 0 20px 0 rgba(245, 158, 11, 0.3)",
      },
    },
  },
  plugins: [],
};

export default config;
