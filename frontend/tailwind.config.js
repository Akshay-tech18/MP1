/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // DevPilot Premium Color System
        dp: {
          // Accent colors
          primary: "#7c3aed",       // Vivid purple
          "primary-light": "#a78bfa",
          "primary-dark": "#6d28d9",
          accent: "#ec4899",        // Pink accent
          "accent-light": "#f472b6",
          secondary: "#3b82f6",     // Blue
          success: "#10b981",       // Emerald
          warning: "#f59e0b",       // Amber
          danger: "#ef4444",        // Red

          // Dark theme surfaces
          dark: {
            bg: "#0a0e1a",          // Deep navy background
            "bg-secondary": "#0f1424",
            surface: "#111827",     // Card/panel surface
            "surface-hover": "#1a2035",
            elevated: "#1e293b",    // Elevated elements
            border: "#1e293b",
            "border-light": "#2d3a52",
            sidebar: "#080c16",     // Deep sidebar
            "sidebar-hover": "#111827",
            input: "#0f172a",
          },

          // Light theme surfaces
          light: {
            bg: "#f8fafc",          // Soft cream background
            "bg-secondary": "#f1f5f9",
            surface: "#ffffff",     // Card/panel surface
            "surface-hover": "#f8fafc",
            elevated: "#ffffff",
            border: "#e2e8f0",
            "border-light": "#f1f5f9",
            sidebar: "#ffffff",
            "sidebar-hover": "#f8fafc",
            input: "#f8fafc",
          },

          // Text colors
          text: {
            primary: "#f8fafc",     // Dark mode primary text
            secondary: "#94a3b8",
            muted: "#64748b",
            "light-primary": "#0f172a",  // Light mode primary text
            "light-secondary": "#475569",
            "light-muted": "#94a3b8",
          }
        },

        // Legacy clickup colors (for any references not yet migrated)
        clickup: {
          primary: "#7c3aed",
          pink: "#ec4899",
          dark: {
            DEFAULT: "#0a0e1a",
            sidebar: "#080c16",
            card: "#111827",
            border: "#1e293b"
          },
          light: {
            DEFAULT: "#f8fafc",
            sidebar: "#ffffff",
            card: "#ffffff",
            border: "#e2e8f0"
          },
          text: {
            primary: "#0f172a",
            secondary: "#475569",
            muted: "#94a3b8"
          }
        }
      },

      fontFamily: {
        display: ['Satoshi', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"Space Mono"', '"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },

      fontSize: {
        'hero': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.03em', fontWeight: '800' }],
        'title': ['1.75rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
        'subtitle': ['1.125rem', { lineHeight: '1.4', letterSpacing: '-0.01em', fontWeight: '600' }],
      },

      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },

      backdropBlur: {
        xs: '2px',
        '2xl': '40px',
        '3xl': '64px',
      },

      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.12)',
        'glass-dark': '0 8px 32px rgba(0, 0, 0, 0.4)',
        'glass-sm': '0 2px 12px rgba(0, 0, 0, 0.08)',
        'glow': '0 0 20px rgba(124, 58, 237, 0.3)',
        'glow-lg': '0 0 40px rgba(124, 58, 237, 0.4)',
        'glow-pink': '0 0 20px rgba(236, 72, 153, 0.3)',
        'glow-accent': '0 0 30px rgba(124, 58, 237, 0.25), 0 0 60px rgba(236, 72, 153, 0.15)',
        'card-hover': '0 20px 40px rgba(0, 0, 0, 0.15)',
        'card-hover-dark': '0 20px 40px rgba(0, 0, 0, 0.5)',
        'elevated': '0 4px 24px rgba(0, 0, 0, 0.06)',
        'elevated-dark': '0 4px 24px rgba(0, 0, 0, 0.3)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
      },

      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 2s infinite',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'aurora-shift': 'aurora-shift 8s ease-in-out infinite',
        'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-left': 'slide-in-left 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-up': 'fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fade-in 0.3s ease-out',
        'scale-in': 'scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'bounce-subtle': 'bounce-subtle 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'spin-slow': 'spin 3s linear infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'gradient-x': 'gradient-x 6s ease infinite',
        'typing-dot': 'typing-dot 1.4s infinite ease-in-out',
      },

      keyframes: {
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'aurora-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '25%': { backgroundPosition: '50% 0%' },
          '50%': { backgroundPosition: '100% 50%' },
          '75%': { backgroundPosition: '50% 100%' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'fade-up': {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'bounce-subtle': {
          '0%': { transform: 'scale(0.95)' },
          '50%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(124, 58, 237, 0.2)' },
          '50%': { boxShadow: '0 0 40px rgba(124, 58, 237, 0.4)' },
        },
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'typing-dot': {
          '0%, 60%, 100%': { transform: 'translateY(0)' },
          '30%': { transform: 'translateY(-4px)' },
        },
      },

      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },

      backgroundImage: {
        'aurora': 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(236,72,153,0.1), rgba(59,130,246,0.1))',
        'aurora-dark': 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(236,72,153,0.15), rgba(59,130,246,0.15))',
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
        'text-gradient': 'linear-gradient(135deg, #7c3aed, #ec4899, #3b82f6)',
        'mesh': 'radial-gradient(at 40% 20%, rgba(124,58,237,0.12) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(236,72,153,0.08) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(59,130,246,0.08) 0px, transparent 50%)',
        'mesh-dark': 'radial-gradient(at 40% 20%, rgba(124,58,237,0.18) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(236,72,153,0.12) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(59,130,246,0.12) 0px, transparent 50%)',
      },
    },
  },
  plugins: [],
}