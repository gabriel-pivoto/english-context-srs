import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(222.2, 84%, 4.9%)",
        foreground: "hsl(210, 40%, 98%)",
        primary: {
          DEFAULT: "hsl(217.2, 91.2%, 59.8%)",
          foreground: "hsl(210, 40%, 98%)",
        },
        secondary: {
          DEFAULT: "hsl(222.2, 47.4%, 11.2%)",
          foreground: "hsl(210, 40%, 96.1%)",
        },
        accent: {
          DEFAULT: "hsl(142.1, 70.6%, 45.3%)",
          foreground: "hsl(355.7, 100%, 97.3%)",
        },
        muted: {
          DEFAULT: "hsl(213, 22%, 16%)",
          foreground: "hsl(217, 19%, 68%)",
        },
        border: "hsl(217.2, 32.6%, 17.5%)",
        input: "hsl(217.2, 32.6%, 17.5%)",
        ring: "hsl(224.3, 76.3%, 48%)",
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.25rem",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
