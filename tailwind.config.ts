import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Byggeplads-palet. Bevidst UDEN de blaa/groenne "Claude"-toner.
        hjelm: {
          // Sikkerhedshjelm-gul / advarselsgul
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f5a623', // primaer
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        asfalt: {
          // Moerk asfalt/beton
          50: '#f6f6f7',
          100: '#e3e3e6',
          200: '#c7c7cd',
          300: '#a3a3ac',
          400: '#7c7c87',
          500: '#61616b',
          600: '#4d4d55',
          700: '#3f3f45',
          800: '#2a2a2e',
          900: '#1c1c1f',
          950: '#121214',
        },
        advarsel: {
          // Keglorange til statustags/aktioner
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
        },
        // Status-farver
        murstensroed: '#b4452e',
        graes: '#5a7d3c', // bevidst daempet, ikke neon-groen
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      backgroundImage: {
        // Advarselsstriber (gul/sort) til bannere
        'advarselsstriber':
          'repeating-linear-gradient(45deg, #f5a623, #f5a623 20px, #1c1c1f 20px, #1c1c1f 40px)',
      },
    },
  },
  plugins: [],
};

export default config;
