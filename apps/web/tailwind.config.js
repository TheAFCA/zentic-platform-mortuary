/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--brand-primary, #0f5e59)',
          hover: 'var(--brand-primary-hover, #0b4c48)',
          light: 'rgba(15, 94, 89, 0.1)',
        },
        secondary: {
          DEFAULT: 'var(--brand-secondary, #16213e)',
        },
        ink: '#1f2937',
        muted: '#6b7280',
        border: '#e7e9ee',
        surface: '#f7f8fa',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
        '4xl': '1.5rem',
      },
      boxShadow: {
        'card': '0 12px 32px rgba(17, 24, 39, 0.06)',
        'card-hover': '0 20px 48px rgba(17, 24, 39, 0.1)',
        'button': '0 12px 24px rgba(15, 94, 89, 0.2)',
        'button-hover': '0 16px 30px rgba(15, 94, 89, 0.26)',
        'dialog': '0 28px 64px rgba(15, 23, 42, 0.28)',
        'login': '0 20px 55px rgba(17, 24, 39, 0.08)',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'slide-up': 'slideUp 200ms ease-out',
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
      },
    },
  },
  plugins: [],
};
