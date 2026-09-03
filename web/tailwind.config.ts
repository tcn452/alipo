import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: '#06452f',
        ink: '#11231c',
        muted: '#66736d',
        ivory: '#f7f3e9',
        line: '#d9d6cb',
        orange: '#e96a24',
        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          900: "#064e3b",
        },
        fuel: {
          available: "#16a34a",
          low: "#ca8a04",
          out: "#dc2626",
          unknown: "#6b7280"
        }
      },
      fontFamily: {
        sans: ['var(--font-body)', 'sans-serif'],
        display: ['var(--font-display)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
