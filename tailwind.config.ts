import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      maxWidth: {
        'mobile': '480px',
      },
      colors: {
        primary: {
          DEFAULT: '#3B82F6', // azul
          dark: '#2563EB',
          light: '#60A5FA',
        },
        secondary: {
          DEFAULT: '#10B981', // verde
          dark: '#059669',
          light: '#34D399',
        },
        background: {
          light: '#FFFFFF',
          dark: '#121212',
        },
        card: {
          light: '#F3F4F6',
          dark: '#1F2937',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)'],
        mono: ['var(--font-geist-mono)'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};

export default config;
