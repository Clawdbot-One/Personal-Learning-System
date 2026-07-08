/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // avoid clobbering Ant Design component styles
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        brand: { 50: '#eff4ff', 100: '#dbeafe', 500: '#2563eb', 600: '#1d4ed8', 700: '#1e40af' },
      },
    },
  },
  plugins: [],
}
