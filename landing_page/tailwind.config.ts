import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0F766E',
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
        deep: '#0B1220',
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
          'radial-gradient(1200px 600px at 12% -10%, #F0FDFA 0%, transparent 55%), radial-gradient(900px 500px at 95% 0%, #FEF3C7 0%, transparent 55%)',
        'download-gradient':
          'radial-gradient(700px 350px at 80% 50%, rgba(15,118,110,0.35), transparent 60%), radial-gradient(500px 300px at 10% 30%, rgba(245,158,11,0.18), transparent 60%)',
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
