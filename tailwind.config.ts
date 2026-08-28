import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

export default {
  content: ["./src/**/*.{html,ts,tsx}"],
  darkMode: "selector",
  theme: {
    extend: {
      fontFamily: {
        // Tip: Added system fallbacks for better performance
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Newsreader", "ui-serif", "Georgia", "serif"],
        mono: ['"Input Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [typography],
} satisfies Config;
