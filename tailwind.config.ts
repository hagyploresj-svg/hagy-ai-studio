import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: { colors: {
    bg: "#09090F", surface: "#151522", violet: "#8B5CF6", electric: "#3B82F6",
    pink: "#EC4899", action: "#F97316", ink: "#F8FAFC",
  } } },
  plugins: [],
} satisfies Config;
