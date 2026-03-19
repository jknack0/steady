import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        teal: { DEFAULT: '#5B8A8A', light: '#7BA3A3', dark: '#4A7272' },
        'sky-brand': { DEFAULT: '#89B4C8', light: '#A8CBDA', dark: '#6A97AD' },
        sage: { DEFAULT: '#8FAE8B', light: '#A8C3A5', dark: '#729070' },
        cream: { DEFAULT: '#F5ECD7', light: '#FAF6ED', dark: '#E8DCC2' },
        'rose-brand': { DEFAULT: '#D4A0A0', light: '#E0BABA', dark: '#C08585' },
        warm: {
          50: '#F7F5F2',
          100: '#F0EDE8',
          200: '#D4D0CB',
          300: '#8A8A8A',
          400: '#5A5A5A',
          500: '#2D2D2D',
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
