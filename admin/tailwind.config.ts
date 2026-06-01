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
          // Premium teal scale
          '50':  '#F0FAF8',
          '100': '#D9F2EE',
          '600': '#0D6B63',
          '700': '#0B5C55',
          tint:  'rgba(15,118,110,.07)',
          // Legacy aliases
          hover:  '#0D6B63',
          active: '#0A5C55',
          light:  '#D9F2EE',
          soft:   '#F0FAF8',
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

        /* ── 3-step gray ladder (new tokens) ────────────────────────────── */
        'icon-rest':        '#AEB6C2',
        'border-strong':    '#D4D8DF',
        'muted-foreground-2': '#8B95A4',

        /* ── Status — deep text on soft tint, no rings ───────────────────── */
        danger: {
          DEFAULT: '#B4321F',
          hover:   '#9A2B1A',
          light:   '#FDF0EE',
        },
        warning: {
          DEFAULT: '#9A5B0B',
          hover:   '#7F4A08',
          light:   '#FDF3E3',
        },
        success: {
          DEFAULT: '#067A57',
          hover:   '#05654A',
          light:   '#E9FAF1',
        },
        info: {
          DEFAULT: '#2056C7',
          hover:   '#1A45A8',
          light:   '#EDF3FE',
        },

        /* ── Raise — near-white surface for table heads / inset panels ─────── */
        raise: '#FCFCFD',

        /* ── Legacy surface aliases (kept for any remaining uses) ────────── */
        surface:          '#FFFFFF',
        'surface-soft':   '#F4F5F7',
        'surface-muted':  '#F4F5F7',
        'border-soft':    '#ECEEF1',
        'border-muted':   '#D4D8DF',
        'text-primary':   '#15181D',
        'text-secondary': '#5A6371',
        'text-hint':      '#8B95A4',
        sidebar:          '#FFFFFF',
        deep:             '#15181D',
      },

      /* ── Radius — consistent scale ──────────────────────────────────────── */
      borderRadius: {
        sm:  '6px',
        md:  '8px',
        lg:  '10px',
        xl:  '12px',
        '2xl': '16px',
      },

      /* ── Fonts ───────────────────────────────────────────────────────────── */
      fontFamily: {
        sans: ['var(--font-geist)', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },

      /* ── Elevation — soft, low-opacity, single-edge ─────────────────────── */
      boxShadow: {
        xs:       '0 1px 2px rgba(18,22,31,.05)',
        card:     '0 1px 2px rgba(18,22,31,.04), 0 2px 6px -1px rgba(18,22,31,.05)',
        md:       '0 4px 10px -3px rgba(18,22,31,.08), 0 10px 26px -8px rgba(18,22,31,.10)',
        teal:     '0 1px 2px rgba(15,118,110,.32), 0 2px 8px -2px rgba(15,118,110,.30)',
        // Legacy aliases kept
        'card-md': '0 4px 10px -3px rgba(18,22,31,.08), 0 10px 26px -8px rgba(18,22,31,.10)',
        'card-lg': '0 8px 16px -4px rgba(18,22,31,.10), 0 20px 40px -8px rgba(18,22,31,.12)',
        header:    '0 1px 0 0 hsl(220 12% 94%), 0 2px 8px 0 rgba(18,22,31,.04)',
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
          from: { opacity: '0', transform: 'translateY(4px)' },
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
        'page-enter':      'page-enter 0.18s ease-out',
        'premium-shimmer': 'premium-shimmer 3s infinite linear',
      },
    },
  },
  plugins: [],
};

export default config;
