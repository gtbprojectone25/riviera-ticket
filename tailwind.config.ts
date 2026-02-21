import type { Config } from "tailwindcss";

const config = {
  content: [
    "./src/**/*.{ts,tsx,mdx}",
  ],
  theme: {
    extend: {
      spacing: {
        "touch-1": "4px",
        "touch-2": "8px",
        "touch-3": "12px",
        "touch-4": "16px",
        "touch-6": "24px",
        "touch-8": "32px",
      },
      borderRadius: {
        "touch-sm": "12px",
        "touch-md": "16px",
        "touch-lg": "20px",
      },
      fontSize: {
        title: ["1.5rem", { lineHeight: "2rem" }],
        section: ["1.25rem", { lineHeight: "1.75rem" }],
        body: ["1rem", { lineHeight: "1.5rem" }],
        small: ["0.875rem", { lineHeight: "1.25rem" }],
        caption: ["0.75rem", { lineHeight: "1rem" }],
        label: ["0.75rem", { lineHeight: "1rem", fontWeight: "600" }],
      },
      keyframes: {
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        shimmer: "shimmer 2s infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
