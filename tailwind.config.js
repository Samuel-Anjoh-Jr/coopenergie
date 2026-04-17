/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'soleil': {
          DEFAULT: '#FBBF24', // Amber 400
          light: '#FDE68A', // Amber 200
          dark: '#D97706',  // Amber 600
        },
        'nuit': {
          DEFAULT: '#1E3A8A', // Blue 900
          light: '#3B82F6',   // Blue 500
          dark: '#0F172A',    // Slate 900
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
