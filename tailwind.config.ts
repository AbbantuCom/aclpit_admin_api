import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        forest: 'var(--color-forest)',
        pine:   'var(--color-pine)',
        moss:   'var(--color-moss)',
        sage:   'var(--color-sage)',
        earth:  'var(--color-earth)',
        clay:   'var(--color-clay)',
        wheat:  'var(--color-wheat)',
        cream:  'var(--color-cream)',
        linen:  'var(--color-linen)',
        chalk:  'var(--color-chalk)',
        wine:      'var(--color-wine)',
        'wine-dark': 'var(--color-wine-dark)',
      },
      fontFamily: {
        sans:    ['Arial', 'Helvetica', 'sans-serif'],
        display: ['var(--font-display)'],
        body:    ['var(--font-body)'],
      },
    },
  },
  plugins: [],
};

export default config;
