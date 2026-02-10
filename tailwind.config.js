/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'theme-bg': 'var(--color-bg)',
        'theme-primary': 'var(--color-primary)',
        'theme-border': 'var(--color-border)',
        'theme-card': 'var(--color-card)',
        'theme-accent': 'var(--color-accent)',
      }
    },
  },
  plugins: [],
}
