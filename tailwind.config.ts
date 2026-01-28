import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      screens: {
        /** Tablet breakpoint: 900px (fills gap between md:768px and lg:1024px) */
        tablet: '900px',
      },
      fontSize: {
        // Optimized typography scale for chat readability
        // Base mobile: 16px (prevents iOS zoom on input focus)
        // Base desktop: 15px (comfortable reading at typical viewing distances)
        'chat-base': ['15px', { lineHeight: '1.6', letterSpacing: '0.01em' }],
        'chat-user': ['15px', { lineHeight: '1.5', letterSpacing: '0.01em' }],
        'chat-assistant': ['14px', { lineHeight: '1.4', letterSpacing: '0.005em' }],
      },
      backgroundSize: {
        'auto': 'auto',
        'cover': 'cover',
        'contain': 'contain',
        '200%': '200% auto',  // For shimmer effect
      },
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
          /** Accessible muted text - Higher contrast for WCAG AA compliance (4.5:1 minimum)
           * Light mode: ~60% opacity instead of 45% (muted-foreground)
           * Dark mode: ~70% opacity instead of 55% (muted-foreground)
           * Use for critical secondary text that needs better readability
           */
          "foreground-accessible": "hsl(var(--muted-foreground-accessible))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        gradient: {
          start: "hsl(var(--gradient-start))",
          end: "hsl(var(--gradient-end))",
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, hsl(var(--gradient-start)), hsl(var(--gradient-end)))',
        'gradient-subtle': 'linear-gradient(180deg, hsl(var(--gradient-start) / 0.1), hsl(var(--gradient-end) / 0.1))',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "0.375rem", // 6px for pill components
      },
      keyframes: {
        // Radix UI component animations
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },

        // Unified fade animations (consistent 12px translate distance)
        "fade-in": {
          from: {
            opacity: "0",
            transform: "translateY(12px)",
          },
          to: {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "fade-in-left": {
          from: {
            opacity: "0",
            transform: "translateX(-12px)",
          },
          to: {
            opacity: "1",
            transform: "translateX(0)",
          },
        },
        "fade-in-right": {
          from: {
            opacity: "0",
            transform: "translateX(12px)",
          },
          to: {
            opacity: "1",
            transform: "translateX(0)",
          },
        },
        "fade-out-left": {
          from: {
            opacity: "1",
            transform: "translateX(0)",
          },
          to: {
            opacity: "0",
            transform: "translateX(-12px)",
          },
        },
        "fade-out-right": {
          from: {
            opacity: "1",
            transform: "translateX(0)",
          },
          to: {
            opacity: "0",
            transform: "translateX(12px)",
          },
        },

        // Scale animations for modals/artifacts
        "scale-in": {
          from: {
            opacity: "0",
            transform: "scale(0.95)",
          },
          to: {
            opacity: "1",
            transform: "scale(1)",
          },
        },
        "scale-out": {
          from: {
            opacity: "1",
            transform: "scale(1)",
          },
          to: {
            opacity: "0",
            transform: "scale(0.95)",
          },
        },

        // Skeleton loader animations
        "shimmer": {
          "0%": {
            backgroundPosition: "200% 0",
          },
          "100%": {
            backgroundPosition: "-200% 0",
          },
        },
        "shimmer-pulse": {
          "0%, 100%": {
            backgroundPosition: "200% 0",
            opacity: "0.8",
          },
          "50%": {
            backgroundPosition: "0% 0",
            opacity: "1",
          },
        },
      },
      animation: {
        // Radix UI (200ms, standard easing)
        "accordion-down": "accordion-down 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        "accordion-up": "accordion-up 0.2s cubic-bezier(0.4, 0, 0.2, 1)",

        // Fade animations (300ms moderate, 200ms normal)
        "fade-in": "fade-in 0.3s cubic-bezier(0, 0, 0.2, 1)",
        "fade-in-left": "fade-in-left 0.2s cubic-bezier(0, 0, 0.2, 1) forwards",
        "fade-in-right": "fade-in-right 0.2s cubic-bezier(0, 0, 0.2, 1) forwards",
        "fade-out-left": "fade-out-left 0.2s cubic-bezier(0.4, 0, 1, 1) forwards",
        "fade-out-right": "fade-out-right 0.2s cubic-bezier(0.4, 0, 1, 1) forwards",

        // Scale animations (200ms, decelerate easing)
        "scale-in": "scale-in 0.2s cubic-bezier(0, 0, 0.2, 1)",
        "scale-out": "scale-out 0.2s cubic-bezier(0.4, 0, 1, 1)",

        // Skeleton loaders (continuous)
        "shimmer": "shimmer 4s infinite linear",
        "shimmer-pulse": "shimmer-pulse 3s infinite cubic-bezier(0.4, 0, 0.2, 1)",
      },
      typography: {
        DEFAULT: {
          css: {
            // Override heading colors to use theme foreground
            'h1, h2, h3, h4, h5, h6': {
              color: 'hsl(var(--foreground))',
            },
            // Override strong/bold to use theme foreground
            'strong': {
              color: 'hsl(var(--foreground))',
            },
            // Override links to use theme primary
            'a': {
              color: 'hsl(var(--primary))',
              '&:hover': {
                color: 'hsl(var(--primary))',
              },
            },
            // Override code to use theme colors
            'code': {
              color: 'hsl(var(--foreground))',
              backgroundColor: 'hsl(var(--muted))',
            },
            // Override pre to use theme colors
            'pre': {
              color: 'hsl(var(--foreground))',
              backgroundColor: 'hsl(var(--muted))',
            },
            // Override blockquote to use theme colors
            'blockquote': {
              color: 'hsl(var(--muted-foreground))',
              borderLeftColor: 'hsl(var(--border))',
            },
            // Override th to use theme colors
            'th': {
              color: 'hsl(var(--foreground))',
            },
          },
        },
        invert: {
          css: {
            // Override heading colors for dark mode (prose-invert)
            'h1, h2, h3, h4, h5, h6': {
              color: 'hsl(var(--foreground))',
            },
            // Override strong/bold to use theme foreground in dark mode
            'strong': {
              color: 'hsl(var(--foreground))',
            },
            // Override links to use theme primary in dark mode
            'a': {
              color: 'hsl(var(--primary))',
              '&:hover': {
                color: 'hsl(var(--primary))',
              },
            },
            // Override code to use theme colors in dark mode
            'code': {
              color: 'hsl(var(--foreground))',
              backgroundColor: 'hsl(var(--muted))',
            },
            // Override pre to use theme colors in dark mode
            'pre': {
              color: 'hsl(var(--foreground))',
              backgroundColor: 'hsl(var(--muted))',
            },
            // Override blockquote to use theme colors in dark mode
            'blockquote': {
              color: 'hsl(var(--muted-foreground))',
              borderLeftColor: 'hsl(var(--border))',
            },
            // Override th to use theme colors in dark mode
            'th': {
              color: 'hsl(var(--foreground))',
            },
          },
        },
      },
    },
  },
  plugins: [
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("tailwindcss-animate"),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("@tailwindcss/typography")
  ],
} satisfies Config;
