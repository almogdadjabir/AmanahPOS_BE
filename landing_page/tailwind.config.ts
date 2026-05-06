import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0F766E',
          dark: '#0A5C55',
          light: '#CCFBF1',
          soft: '#F0FDFA',
        },
        secondary: {
          DEFAULT: '#F59E0B',
          light: '#FEF3C7',
        },
        success: {
          DEFAULT: '#16A34A',
          light: '#DCFCE7',
        },
        info: {
          DEFAULT: '#0EA5E9',
          light: '#E0F2FE',
        },
        danger: {
          DEFAULT: '#DB2777',
          light: '#FCE7F3',
        },
        deep: {
          DEFAULT: '#0B1220',
          darker: '#07111E',
          card: '#0D1730',
        },
        surface: '#FFFFFF',
        'surface-soft': '#F1F5F9',
        'border-soft': '#F1F5F9',
        'text-primary': '#0F172A',
        'text-secondary': '#64748B',
        'text-hint': '#94A3B8',
      },
      fontFamily: {
        sans: ['var(--font-nunito)', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'hero-gradient':
          'radial-gradient(ellipse 90% 70% at 15% 0%, rgba(15,118,110,0.5) 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 92% 8%, rgba(245,158,11,0.22) 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 55% 92%, rgba(15,118,110,0.2) 0%, transparent 60%)',
        'download-gradient':
          'radial-gradient(700px 350px at 80% 50%, rgba(15,118,110,0.35), transparent 60%), radial-gradient(500px 300px at 10% 30%, rgba(245,158,11,0.18), transparent 60%)',
        'pricing-featured':
          'linear-gradient(145deg, #0F172A 0%, #0B1220 60%, #051510 100%)',
        'cta-gradient':
          'linear-gradient(135deg, #0F766E 0%, #0A5C55 100%)',
        'section-dark':
          'radial-gradient(ellipse 70% 60% at 100% 50%, rgba(15,118,110,0.12) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 0% 80%, rgba(245,158,11,0.08) 0%, transparent 50%), #07111E',
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.4, 0, 0.2, 1) both',
      },
      keyframes: {
        'fade-up': {
          'from': { opacity: '0', transform: 'translateY(20px)' },
          'to':   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        'glow-teal':    '0 0 40px 10px rgba(15,118,110,0.35)',
        'glow-teal-sm': '0 0 16px 4px rgba(15,118,110,0.25)',
        'glow-amber':   '0 0 30px 8px rgba(245,158,11,0.3)',
        'card':         '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        'card-hover':   '0 10px 40px rgba(0,0,0,0.12)',
        'phone':        '0 60px 120px -20px rgba(0,0,0,0.7), 0 0 80px rgba(15,118,110,0.35)',
        'float-card':   '0 24px 60px -15px rgba(15,23,42,0.28)',
      },
      borderRadius: {
        '2xl': '18px',
        '3xl': '24px',
        '4xl': '30px',
        phone: '44px',
      },
    },
  },
  plugins: [],
};

export default config;
