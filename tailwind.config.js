/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'rgb(37 99 235 / <alpha-value>)',
        danger: 'rgb(220 38 38 / <alpha-value>)',
        income: 'rgb(22 163 74 / <alpha-value>)',
        expense: 'rgb(37 99 235 / <alpha-value>)',
      }
    }
  },
  plugins: [],
}