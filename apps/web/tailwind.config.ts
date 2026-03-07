import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#FF6B35",
        secondary: "#2EC4B6",
        background: "#FAFAFA",
        surface: "#FFFFFF",
        "text-primary": "#1A1A2E",
        "text-secondary": "#6B7280",
        success: "#10B981",
        warning: "#F59E0B",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
