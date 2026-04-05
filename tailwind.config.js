/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          black: "#0f172a",
          accent: "#06b6d4"
        }
      }
    },
  },
  plugins: [],
}