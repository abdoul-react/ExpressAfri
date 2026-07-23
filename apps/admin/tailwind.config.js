/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#fff0e6',
          100: '#ffd6b3',
          200: '#ffb380',
          300: '#ff914d',
          400: '#ff751a',
          500: '#E8590C',
          600: '#cc4f0a',
          700: '#b04309',
          800: '#943807',
          900: '#782e06',
          950: '#4d1e04',
        },
        secondary: {
          50: '#e6f9e8',
          100: '#b3edba',
          200: '#80e08c',
          300: '#4dd45e',
          400: '#1ac730',
          500: '#0DB02B',
          600: '#0a9e25',
          700: '#088b20',
          800: '#06781b',
          900: '#056616',
          950: '#03400e',
        },
        accent: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366F1',
          600: '#5850EC',
          700: '#4f46e5',
          800: '#4338ca',
          900: '#3730a3',
        },
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 4px -1px rgb(0 0 0 / 0.06)',
        'card-hover': '0 4px 12px -2px rgb(0 0 0 / 0.10), 0 2px 6px -2px rgb(0 0 0 / 0.06)',
        dropdown: '0 4px 16px -4px rgb(0 0 0 / 0.14), 0 2px 6px -2px rgb(0 0 0 / 0.08)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up-fade': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'zoom-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'slide-up-fade': 'slide-up-fade 200ms ease-out',
        'zoom-in': 'zoom-in 150ms ease-out',
      },
    },
  },
  plugins: [],
}
