/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      fontFamily: {
        'urdu': ['Noto Sans Urdu', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
