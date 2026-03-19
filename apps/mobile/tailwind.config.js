/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        teal: { DEFAULT: '#5B8A8A', light: '#7BA3A3', dark: '#4A7272' },
        sky: { DEFAULT: '#89B4C8', light: '#A8CBDA', dark: '#6A97AD' },
        sage: { DEFAULT: '#8FAE8B', light: '#A8C3A5', dark: '#729070' },
        cream: { DEFAULT: '#F5ECD7', light: '#FAF6ED', dark: '#E8DCC2' },
        rose: { DEFAULT: '#D4A0A0', light: '#E0BABA', dark: '#C08585' },
        warm: {
          50: '#F7F5F2',
          100: '#F0EDE8',
          200: '#D4D0CB',
          300: '#8A8A8A',
          400: '#5A5A5A',
          500: '#2D2D2D',
        },
      },
      fontFamily: {
        sans: ['PlusJakartaSans_400Regular'],
        'sans-medium': ['PlusJakartaSans_500Medium'],
        'sans-semibold': ['PlusJakartaSans_600SemiBold'],
        'sans-bold': ['PlusJakartaSans_700Bold'],
      },
    },
  },
  plugins: [],
};
