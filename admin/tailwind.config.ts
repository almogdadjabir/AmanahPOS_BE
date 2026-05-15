import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /* ── shadcn CSS-variable tokens ───────────────────────────────────── */
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT:    'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          /* Keep legacy aliases for existing code */
          hover:  '#0D6B63',
          active: '#0A5C55',
          light:  '#CCFBF1',
          soft:   '#F0FDFA',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border:  'hsl(var(--border))',
        input:   'hsl(var(--input))',
        ring:    'hsl(var(--ring))',

        /* ── Semantic palette (keep backward compat) ──────────────────────── */
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

        /* ── Surface aliases ──────────────────────────────────────────────── */
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
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-nunito)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card:      '0 1px 2px 0 rgb(0 0 0 / .04), 0 4px 16px 0 rgb(0 0 0 / .06)',
        'card-md': '0 4px 8px -1px rgb(0 0 0 / .07), 0 12px 32px -4px rgb(0 0 0 / .08)',
        'card-lg': '0 10px 20px -3px rgb(0 0 0 / .09), 0 24px 48px -8px rgb(0 0 0 / .1)',
        header:    '0 1px 0 0 hsl(215 22% 88%), 0 2px 8px 0 rgb(0 0 0 / .04)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
        },
        'page-enter': {
          from: { opacity: '0', transform: 'translateY(5px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'premium-shimmer': {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(300%)' },
        },
      },
      animation: {
        'accordion-down':  'accordion-down 0.2s ease-out',
        'accordion-up':    'accordion-up 0.2s ease-out',
        'page-enter':      'page-enter 0.22s ease-out',
        'premium-shimmer': 'premium-shimmer 3s infinite linear',
      },
    },
  },
  plugins: [],
};

export default config;
