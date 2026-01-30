/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0f172a',
        'bg-secondary': '#1e293b',
        'text-primary': '#f1f5f9',
        'text-secondary': '#94a3b8',
        'border': '#334155',
        'accent-green': '#10b981',
        'accent-red': '#ef4444',
      },
      animation: {
        'pulse': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      backdropBlur: {
        'xl': '24px',
      }
    },
  },
  plugins: [],
  safelist: [
    'bg-purple-950',
    'bg-purple-500',
    'bg-purple-600',
    'bg-purple-700',
    'text-purple-200',
    'text-purple-300',
    'text-purple-400',
    'border-purple-500',
    'from-purple-500',
    'to-purple-600',
    'to-purple-700',
    'from-black',
    'via-purple-950',
    'to-black',
  ]
}