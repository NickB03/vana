/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        background: {
          DEFAULT: '#1a1a1a',
          element: '#2d2d2d',
          input: '#3a3a3a',
        },
        border: {
          DEFAULT: '#4a4a4a',
        },
        primary: {
          DEFAULT: '#7c9fff',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#b794f6',
          foreground: '#ffffff',
        },
        accent: {
          blue: '#7c9fff',
          purple: '#b794f6',
          orange: '#f6ad55',
          red: '#fc8181',
        },
        muted: {
          DEFAULT: '#3a3a3a',
          foreground: '#a0a0a0',
        },
        card: {
          DEFAULT: '#2d2d2d',
          foreground: '#ffffff',
        },
        popover: {
          DEFAULT: '#2d2d2d',
          foreground: '#ffffff',
        },
        destructive: {
          DEFAULT: '#fc8181',
          foreground: '#ffffff',
        },
      },
      backgroundImage: {
        'gemini-gradient': 'linear-gradient(135deg, #7c9fff 0%, #b794f6 35%, #fc8181 70%, #f6ad55 100%)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
        "border-spin": {
          "0%": { "--angle": "0deg" },
          "100%": { "--angle": "360deg" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "border-spin": "border-spin 3s linear infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
  ],
}