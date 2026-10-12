import type { Config } from 'tailwindcss'
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        // Fintech Pro Palette
        primary: '#4F46E5', // Indigo 600
        danger: '#E11D48',  // Rose 600
        income: '#10B981',  // Emerald 500
        expense: '#E11D48', // Rose 600 (Semantically correct for expenses)
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.04)',
      }
    }
  },
  plugins: [],
} satisfies Config