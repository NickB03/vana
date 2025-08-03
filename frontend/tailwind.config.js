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
        // Core Vana brand colors
        vana: {
          primary: '#7c9fff',
          secondary: '#b794f6',
          accent: '#f6ad55',
          warning: '#fc8181',
          success: '#68d391',
          info: '#63b3ed',
        },
        
        // Background system
        background: {
          DEFAULT: 'hsl(var(--background) / <alpha-value>)',
          element: 'hsl(var(--background-element) / <alpha-value>)',
          input: 'hsl(var(--background-input) / <alpha-value>)',
          overlay: 'hsl(var(--background-overlay) / <alpha-value>)',
        },
        
        // Foreground colors
        foreground: {
          DEFAULT: 'hsl(var(--foreground) / <alpha-value>)',
          muted: 'hsl(var(--foreground-muted) / <alpha-value>)',
          subtle: 'hsl(var(--foreground-subtle) / <alpha-value>)',
        },
        
        // Border system
        border: {
          DEFAULT: 'hsl(var(--border) / <alpha-value>)',
          muted: 'hsl(var(--border-muted) / <alpha-value>)',
          strong: 'hsl(var(--border-strong) / <alpha-value>)',
        },
        
        // Component colors
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
          muted: 'hsl(var(--primary-muted) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
          foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)',
          muted: 'hsl(var(--secondary-muted) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)',
          blue: '#7c9fff',
          purple: '#b794f6',
          orange: '#f6ad55',
          red: '#fc8181',
        },
        
        // State-based colors
        state: {
          idle: 'var(--state-idle)',
          active: 'var(--state-active)',
          success: 'var(--state-success)',
          warning: 'var(--state-warning)',
          error: 'var(--state-error)',
          processing: 'var(--state-processing)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
          foreground: 'hsl(var(--popover-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)',
        },
      },
      backgroundImage: {
        'gemini-gradient': 'linear-gradient(135deg, #7c9fff 0%, #b794f6 35%, #fc8181 70%, #f6ad55 100%)',
        'vana-gradient': 'linear-gradient(135deg, var(--vana-primary) 0%, var(--vana-secondary) 50%, var(--vana-accent) 100%)',
      },
      borderRadius: {
        lg: "var(--radius, 0.5rem)",
        md: "calc(var(--radius, 0.5rem) - 2px)",
        sm: "calc(var(--radius, 0.5rem) - 4px)",
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'sans-serif'
        ],
        mono: [
          'Fira Code',
          'JetBrains Mono',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace'
        ],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '112': '28rem',
        '128': '32rem',
        // Semantic spacing scale
        'space-xs': 'var(--space-xs)',
        'space-sm': 'var(--space-sm)',
        'space-md': 'var(--space-md)',
        'space-lg': 'var(--space-lg)',
        'space-xl': 'var(--space-xl)',
        'space-2xl': 'var(--space-2xl)',
        'space-3xl': 'var(--space-3xl)',
        'space-4xl': 'var(--space-4xl)',
      },
      opacity: {
        'critical': 'var(--opacity-critical)',
        'high': 'var(--opacity-high)',
        'medium': 'var(--opacity-medium)',
        'low': 'var(--opacity-low)',
        'minimal': 'var(--opacity-minimal)',
        'disabled': 'var(--opacity-disabled)',
        'hover': 'var(--opacity-hover)',
        'pressed': 'var(--opacity-pressed)',
        'focus': 'var(--opacity-focus)',
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