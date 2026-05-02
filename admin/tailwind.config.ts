import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0F766E',
          hover:   '#0D6B63',
          active:  '#0A5C55',
          light:   '#CCFBF1',
          soft:    '#F0FDFA',
        },
        danger: {
          DEFAULT: '#E53E3E',
          hover:   '#C53030',
          light:   '#FFF5F5',
        },
        warning: {
          DEFAULT: '#D97706',
          hover:   '#B45309',
          light:   '#FFFBEB',
        },
        success: {
          DEFAULT: '#059669',
          hover:   '#047857',
          light:   '#ECFDF5',
        },
        info: {
          DEFAULT: '#3B82F6',
          hover:   '#2563EB',
          light:   '#EFF6FF',
        },
        surface:          '#FFFFFF',
        'surface-soft':   '#F8FAFC',
        'surface-muted':  '#F1F5F9',
        'border-soft':    '#E8EDF3',
        'border-muted':   '#CBD5E1',
        'text-primary':   '#111827',
        'text-secondary': '#4B5563',
        'text-hint':      '#9CA3AF',
        sidebar:          '#111827',
        deep:             '#0B1220',
      },
      fontFamily: {
        sans: ['var(--font-nunito)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card:    '0 1px 3px 0 rgb(0 0 0 / .05), 0 1px 2px -1px rgb(0 0 0 / .04)',
        'card-md': '0 4px 6px -1px rgb(0 0 0 / .06), 0 2px 4px -2px rgb(0 0 0 / .04)',
        'card-lg': '0 10px 15px -3px rgb(0 0 0 / .06), 0 4px 6px -4px rgb(0 0 0 / .04)',
        header:  '0 1px 0 0 #E8EDF3, 0 2px 8px 0 rgb(0 0 0 / .04)',
      },
    },
  },
  plugins: [],
};

export default config;
