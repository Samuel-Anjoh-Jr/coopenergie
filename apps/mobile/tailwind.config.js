/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1B5E20",
          foreground: "#F4FBF4",
          muted: "#E7F3E8"
        }
      }
    }
  },
  plugins: []
};