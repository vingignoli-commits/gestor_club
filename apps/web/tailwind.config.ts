import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#f4efe7',
        ink: '#10212b',
        accent: '#007a64',
        warn: '#a65a2a',
        panel: '#fffdf8',
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'sans-serif'],
        display: ['"Space Grotesk"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 14px 40px rgba(16, 33, 43, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;

