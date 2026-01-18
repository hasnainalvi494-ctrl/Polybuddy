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
        // Premium Dark Navy Backgrounds
        "bg-primary": "#0f0f1a",      // Deep navy black
        "bg-secondary": "#14142b",     // Rich navy
        "bg-tertiary": "#1a1a3e",      // Elevated navy
        "border-primary": "#252545",   // Subtle navy border
        "border-secondary": "#2d2d52", // Elevated border
        
        // Enhanced gray scale for dark mode (WCAG AA compliant)
        gray: {
          50: "#f9fafb",
          100: "#f3f4f6",
          200: "#e5e7eb",
          300: "#d1d5db",
          400: "#9ca3af",  // WCAG AA on dark navy
          500: "#6b7280",
          600: "#4b5563",
          700: "#374151",
          800: "#1f2937",
          850: "#1a1a3e",
          900: "#14142b",
          925: "#111122",
          950: "#0f0f1a",
        },
        
        // Royal Indigo - Premium accent (full scale)
        primary: {
          50: "#eef2ff",   // Lightest indigo
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",  // Main Royal Indigo
          600: "#4f46e5",  // Hover state
          700: "#4338ca",  // Active state
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",  // Darkest for backgrounds
        },
        
        // Complementary accent colors
        accent: {
          blue: "#3b82f6",    // Info states
          purple: "#8b5cf6",  // Secondary highlights
          rose: "#f43f5e",    // Danger/sell
          emerald: "#10b981", // Success/buy
        },
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        glow: {
          "0%, 100%": { boxShadow: "0 0 20px 0 rgba(99, 102, 241, 0.3)" },
          "50%": { boxShadow: "0 0 30px 0 rgba(99, 102, 241, 0.5)" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
      animation: {
        shimmer: "shimmer 2s ease-in-out infinite",
        glow: "glow 2s ease-in-out infinite",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      boxShadow: {
        // Royal Indigo glows
        "glow-sm": "0 0 10px 0 rgba(99, 102, 241, 0.2)",
        "glow-md": "0 0 20px 0 rgba(99, 102, 241, 0.3)",
        "glow-lg": "0 0 30px 0 rgba(99, 102, 241, 0.4)",
        "glow-xl": "0 0 40px 0 rgba(99, 102, 241, 0.5)",
        // State-specific glows
        "glow-danger": "0 0 20px 0 rgba(244, 63, 94, 0.3)",
        "glow-success": "0 0 20px 0 rgba(16, 185, 129, 0.3)",
        "glow-warning": "0 0 20px 0 rgba(245, 158, 11, 0.3)",
        // Elevated card shadows
        "card": "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)",
        "card-hover": "0 10px 15px -3px rgba(99, 102, 241, 0.2), 0 4px 6px -2px rgba(99, 102, 241, 0.1)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-primary": "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
        "gradient-mesh": "radial-gradient(at 40% 20%, rgba(99, 102, 241, 0.15) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(139, 92, 246, 0.1) 0px, transparent 50%)",
      },
    },
  },
  plugins: [],
};

export default config;
