import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#E60012',
        'primary-light': '#FFF0F0',
        bg: '#F5F7FA',
        surface: '#FFFFFF',
        text: '#1A1A2E',
        'text-muted': '#6B7280',
        border: '#E5E7EB',
        'locked-bg': '#F9FAFB',
        success: '#10B981',
        warning: '#F59E0B',
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
