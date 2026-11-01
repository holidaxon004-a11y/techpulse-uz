import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/context/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        pulse: {
          cyan: '#06b6d4',
          indigo: '#6366f1',
          emerald: '#10b981',
          obsidian: '#090d16',
        },
      },
    },
  },
  plugins: [],
};

export default config;

