import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#111827',
        stone: '#f4f1ea',
        sand: '#ebe4d6',
        teal: '#0f766e',
        mint: '#14b8a6',
        slate: '#475569',
        line: '#d6d3d1',
        success: '#15803d',
        warning: '#b45309',
        danger: '#b91c1c',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Segoe UI"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', '"SFMono-Regular"', 'monospace'],
      },
      boxShadow: {
        card: '0 24px 50px -24px rgba(15, 23, 42, 0.28)',
      },
      backgroundImage: {
        halo: 'radial-gradient(circle at top left, rgba(20,184,166,0.22), transparent 40%), radial-gradient(circle at top right, rgba(15,118,110,0.18), transparent 35%)',
      },
    },
  },
  plugins: [],
} satisfies Config;
