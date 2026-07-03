/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary-color, #1a1a2e)',
        secondary: 'var(--secondary-color, #16213e)',
      },
    },
  },
  plugins: [],
};
