import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class'],
  theme: {
    extend: {
      // === CUSTOM COLOR PALETTE ===
      colors: {
        // Using CSS custom properties for theme switching
        background: 'var(--color-background)',
        foreground: 'var(--color-foreground)',
        
        surface: {
          DEFAULT: 'var(--color-surface)',
          hover: 'var(--color-surface-hover)',
          active: 'var(--color-surface-active)',
        },
        
        border: {
          DEFAULT: 'var(--color-border)',
          hover: 'var(--color-border-hover)',
          focus: 'var(--color-border-focus)',
        },
        
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
          disabled: 'var(--color-text-disabled)',
        },
        
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          text: 'var(--color-accent-text)',
        },
        
        muted: {
          DEFAULT: 'var(--color-muted)',
          foreground: 'var(--color-muted-foreground)',
        },
        
        // Semantic colors
        primary: {
          50: 'var(--primary-50)',
          100: 'var(--primary-100)',
          200: 'var(--primary-200)',
          300: 'var(--primary-300)',
          400: 'var(--primary-400)',
          500: 'var(--primary-500)',
          600: 'var(--primary-600)',
          700: 'var(--primary-700)',
          800: 'var(--primary-800)',
          900: 'var(--primary-900)',
          950: 'var(--primary-950)',
          DEFAULT: 'var(--primary-500)',
          foreground: 'var(--color-accent-text)',
        },
        
        success: {
          50: 'var(--success-50)',
          100: 'var(--success-100)',
          500: 'var(--success-500)',
          600: 'var(--success-600)',
          700: 'var(--success-700)',
          DEFAULT: 'var(--success-500)',
        },
        
        warning: {
          50: 'var(--warning-50)',
          100: 'var(--warning-100)',
          500: 'var(--warning-500)',
          600: 'var(--warning-600)',
          DEFAULT: 'var(--warning-500)',
        },
        
        error: {
          50: 'var(--error-50)',
          100: 'var(--error-100)',
          500: 'var(--error-500)',
          600: 'var(--error-600)',
          700: 'var(--error-700)',
          DEFAULT: 'var(--error-500)',
        },
        
        // Sidebar specific
        sidebar: {
          background: 'var(--sidebar-background)',
          border: 'var(--sidebar-border)',
          text: 'var(--sidebar-text)',
          'text-secondary': 'var(--sidebar-text-secondary)',
          hover: 'var(--sidebar-hover)',
          active: 'var(--sidebar-active)',
        },
        
        // Chat specific
        chat: {
          background: 'var(--chat-background)',
          surface: 'var(--chat-surface)',
          border: 'var(--chat-border)',
          'input-background': 'var(--chat-input-background)',
          'bubble-user': 'var(--chat-bubble-user)',
          'bubble-assistant': 'var(--chat-bubble-assistant)',
        },
      },
      
      // === SPACING ===
      spacing: {
        0: 'var(--space-0)',
        1: 'var(--space-1)',
        2: 'var(--space-2)',
        3: 'var(--space-3)',
        4: 'var(--space-4)',
        5: 'var(--space-5)',
        6: 'var(--space-6)',
        8: 'var(--space-8)',
        10: 'var(--space-10)',
        12: 'var(--space-12)',
        16: 'var(--space-16)',
        20: 'var(--space-20)',
      },
      
      // === TYPOGRAPHY ===
      fontFamily: {
        sans: ['var(--font-family-sans)'],
        mono: ['var(--font-family-mono)'],
      },
      
      fontSize: {
        xs: ['var(--font-size-xs)', { lineHeight: 'var(--line-height-normal)' }],
        sm: ['var(--font-size-sm)', { lineHeight: 'var(--line-height-normal)' }],
        base: ['var(--font-size-base)', { lineHeight: 'var(--line-height-normal)' }],
        lg: ['var(--font-size-lg)', { lineHeight: 'var(--line-height-normal)' }],
        xl: ['var(--font-size-xl)', { lineHeight: 'var(--line-height-tight)' }],
        '2xl': ['var(--font-size-2xl)', { lineHeight: 'var(--line-height-tight)' }],
        '3xl': ['var(--font-size-3xl)', { lineHeight: 'var(--line-height-tight)' }],
        '4xl': ['var(--font-size-4xl)', { lineHeight: 'var(--line-height-tight)' }],
      },
      
      fontWeight: {
        normal: 'var(--font-weight-normal)',
        medium: 'var(--font-weight-medium)',
        semibold: 'var(--font-weight-semibold)',
        bold: 'var(--font-weight-bold)',
      },
      
      lineHeight: {
        tight: 'var(--line-height-tight)',
        normal: 'var(--line-height-normal)',
        relaxed: 'var(--line-height-relaxed)',
      },
      
      letterSpacing: {
        tight: 'var(--letter-spacing-tight)',
        normal: 'var(--letter-spacing-normal)',
        wide: 'var(--letter-spacing-wide)',
      },
      
      // === BORDER RADIUS ===
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-md)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        full: 'var(--radius-full)',
        
        // Component-specific radii
        button: 'var(--button-radius)',
        card: 'var(--card-radius)',
        input: 'var(--input-radius)',
      },
      
      // === BOX SHADOWS ===
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        '2xl': 'var(--shadow-2xl)',
        
        // Component-specific shadows
        button: 'var(--button-shadow)',
        card: 'var(--card-shadow)',
        dropdown: 'var(--dropdown-shadow)',
      },
      
      // === ANIMATIONS ===
      transitionDuration: {
        fast: 'var(--transition-fast)',
        DEFAULT: 'var(--transition-normal)',
        normal: 'var(--transition-normal)',
        slow: 'var(--transition-slow)',
      },
      
      transitionTimingFunction: {
        linear: 'var(--ease-linear)',
        in: 'var(--ease-in)',
        out: 'var(--ease-out)',
        'in-out': 'var(--ease-in-out)',
        DEFAULT: 'var(--ease-in-out)',
      },
      
      // === COMPONENT VARIANTS ===
      animation: {
        'fade-in': 'fadeIn var(--transition-normal) var(--ease-out)',
        'slide-up': 'slideUp var(--transition-normal) var(--ease-out)',
        'slide-down': 'slideDown var(--transition-normal) var(--ease-out)',
      },
    },
  },
  plugins: [
    // Add custom utilities
    function({ addUtilities }) {
      addUtilities({
        '.minimal-surface': {
          backgroundColor: 'var(--color-surface)',
          borderWidth: '1px',
          borderColor: 'var(--color-border)',
          borderRadius: 'var(--card-radius)',
          boxShadow: 'var(--card-shadow)',
        },
        '.minimal-button': {
          backgroundColor: 'var(--color-accent)',
          color: 'var(--color-accent-text)',
          borderRadius: 'var(--button-radius)',
          boxShadow: 'var(--button-shadow)',
          fontWeight: 'var(--font-weight-medium)',
          transition: 'background-color var(--transition-normal) var(--ease-in-out)',
          '&:hover': {
            backgroundColor: 'var(--color-accent-hover)',
          },
        },
        '.minimal-input': {
          backgroundColor: 'var(--color-surface)',
          borderWidth: '1px',
          borderColor: 'var(--color-border)',
          borderRadius: 'var(--input-radius)',
          padding: 'var(--space-3)',
          fontSize: 'var(--font-size-base)',
          color: 'var(--color-text-primary)',
          transition: 'border-color var(--transition-normal) var(--ease-in-out)',
          '&:focus': {
            outline: '2px solid var(--color-border-focus)',
            outlineOffset: '2px',
          },
        },
        '.minimal-card': {
          backgroundColor: 'var(--color-surface)',
          borderWidth: '1px',
          borderColor: 'var(--color-border)',
          borderRadius: 'var(--card-radius)',
          boxShadow: 'var(--card-shadow)',
          padding: 'var(--space-6)',
        },
        '.minimal-transition': {
          transitionProperty: 'color, background-color, border-color, opacity, box-shadow',
          transitionDuration: 'var(--transition-normal)',
          transitionTimingFunction: 'var(--ease-in-out)',
        },
      })
    }
  ],
}

export default config