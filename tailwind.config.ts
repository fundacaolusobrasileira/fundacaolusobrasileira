import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './**/*.{ts,tsx}',
    '!./.claude/**',
    '!./node_modules/**',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
        script: ['Pinyon Script', 'cursive'],
      },
      colors: {
        page: '#F9FAFB',
        dark: '#050F0B',
        brand: {
          50: '#F2F7F5',
          100: '#E1EBE6',
          200: '#BFD4CB',
          300: '#94B3A6',
          400: '#6A8F7F',
          500: '#486B5C',
          600: '#2F4D40',
          700: '#1F332B',
          800: '#13211C',
          900: '#0A1410',
          950: '#050F0B',
        },
        sand: {
          50: '#FCFAF7',
          100: '#F7F2EB',
          200: '#EBE0D1',
          300: '#DBC9AD',
          400: '#C9AF88',
          500: '#B09265',
          600: '#8F724B',
          700: '#6E5538',
          900: '#3A2E1F',
        },
        brasil: {
          blue: '#002776',
          yellow: '#FFDF00',
          green: '#009C3B',
        },
        portugal: {
          red: '#FF0000',
          green: '#006600',
        },
      },
      boxShadow: {
        glass: '0 4px 30px rgba(0, 0, 0, 0.1)',
        glow: '0 0 40px -10px rgba(176, 146, 101, 0.3)',
        premium: '0 20px 40px -10px rgba(0,0,0,0.1)',
        float: '0 10px 30px -5px rgba(0,0,0,0.15)',
      },
      backgroundImage: {
        noise: "url('https://www.transparenttextures.com/patterns/stardust.png')",
      },
      keyframes: {
        fadeInUpSlow: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        fadeInUpSlow: 'fadeInUpSlow 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-slow': 'pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in-up-small': 'fadeInUpSlow 0.6s ease-out forwards',
      },
    },
  },
  plugins: [],
} satisfies Config;
