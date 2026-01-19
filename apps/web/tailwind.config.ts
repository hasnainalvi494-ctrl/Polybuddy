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
        // Midnight Teal - Premium Dark Backgrounds
        "bg-primary": "#0a0f14",      // Deep blue-black
        "bg-secondary": "#111820",     // Dark slate
        "bg-tertiary": "#1a2332",      // Elevated slate
        "border-primary": "#243040",   // Subtle border
        "border-secondary": "#2d3a4d", // Elevated border
        
        // Enhanced gray scale for dark mode
        gray: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          850: "#1a2332",
          900: "#111820",
          925: "#0d1219",
          950: "#0a0f14",
        },
        
        // Teal - Primary accent
        primary: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",  // Main Teal
          600: "#0d9488",  // Hover state
          700: "#0f766e",  // Active state
          800: "#115e59",
          900: "#134e4a",
          950: "#042f2e",
        },
        
        // Cyan - Secondary accent
        accent: {
          cyan: "#06b6d4",      // Secondary highlights
          sky: "#0ea5e9",       // Info states
          emerald: "#10b981",   // Success/buy
          rose: "#f43f5e",      // Danger/sell
          amber: "#f59e0b",     // Warning
        },
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        glow: {
          "0%, 100%": { boxShadow: "0 0 20px 0 rgba(20, 184, 166, 0.3)" },
          "50%": { boxShadow: "0 0 30px 0 rgba(20, 184, 166, 0.5)" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        shimmer: "shimmer 2s ease-in-out infinite",
        glow: "glow 2s ease-in-out infinite",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        float: "float 3s ease-in-out infinite",
      },
      boxShadow: {
        // Teal glows
        "glow-sm": "0 0 10px 0 rgba(20, 184, 166, 0.2)",
        "glow-md": "0 0 20px 0 rgba(20, 184, 166, 0.3)",
        "glow-lg": "0 0 30px 0 rgba(20, 184, 166, 0.4)",
        "glow-xl": "0 0 40px 0 rgba(20, 184, 166, 0.5)",
        // State-specific glows
        "glow-danger": "0 0 20px 0 rgba(244, 63, 94, 0.3)",
        "glow-success": "0 0 20px 0 rgba(16, 185, 129, 0.3)",
        "glow-warning": "0 0 20px 0 rgba(245, 158, 11, 0.3)",
        // Elevated card shadows
        "card": "0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)",
        "card-hover": "0 10px 25px -5px rgba(20, 184, 166, 0.2), 0 8px 10px -6px rgba(20, 184, 166, 0.1)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-primary": "linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)",
        "gradient-mesh": "radial-gradient(at 40% 20%, rgba(20, 184, 166, 0.12) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(6, 182, 212, 0.08) 0px, transparent 50%)",
        "gradient-hero": "linear-gradient(135deg, #0a0f14 0%, #111820 50%, #0d1219 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
