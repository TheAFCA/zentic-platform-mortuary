/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--brand-primary, #0f5e59)',
          hover: 'var(--brand-primary-hover, #0b4c48)',
          light: 'var(--brand-primary-light, rgba(15, 94, 89, 0.08))',
          subtle: 'var(--brand-primary-subtle, rgba(15, 94, 89, 0.04))',
        },
        secondary: {
          DEFAULT: 'var(--brand-secondary, #16213e)',
          light: 'var(--brand-secondary-light, rgba(22, 33, 62, 0.06))',
        },
        ink: {
          DEFAULT: '#1f2937',
          secondary: '#4b5563',
        },
        muted: {
          DEFAULT: '#6b7280',
          light: '#9ca3af',
        },
        border: {
          DEFAULT: '#e7e9ee',
          light: '#f1f3f6',
          dark: '#d1d5db',
        },
        surface: '#f7f8fa',
        error: {
          DEFAULT: '#dc2626',
          bg: '#fef2f2',
          text: '#991b1b',
        },
        success: {
          DEFAULT: '#16a34a',
          bg: '#f0fdf4',
          text: '#166534',
        },
        warning: {
          DEFAULT: '#d97706',
          bg: '#fffbeb',
          text: '#92400e',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace',
        ],
      },
      borderRadius: {
        xs: '0.5rem',
        sm: '0.65rem',
        md: '0.85rem',
        lg: '1rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(15, 23, 42, 0.04)',
        sm: '0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
        md: '0 4px 6px rgba(15, 23, 42, 0.06), 0 2px 4px rgba(15, 23, 42, 0.04)',
        lg: '0 10px 15px rgba(15, 23, 42, 0.06), 0 4px 6px rgba(15, 23, 42, 0.04)',
        xl: '0 20px 48px rgba(17, 24, 39, 0.08)',
        '2xl': '0 28px 64px rgba(15, 23, 42, 0.14)',
        card: '0 12px 32px rgba(17, 24, 39, 0.06)',
        'card-hover': '0 20px 48px rgba(17, 24, 39, 0.1)',
        button: '0 12px 24px rgba(15, 94, 89, 0.2)',
        'button-hover': '0 16px 30px rgba(15, 94, 89, 0.26)',
        dialog: '0 28px 64px rgba(15, 23, 42, 0.28)',
        login: '0 20px 55px rgba(17, 24, 39, 0.08)',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'slide-up': 'slideUp 200ms ease-out',
        'slide-down': 'slideDown 200ms ease-out',
        'scale-in': 'scaleIn 200ms ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
