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
        // Aura Precision — surface tiers
        'surface-base':    '#08090A',
        'surface-raised':  '#0C0D0E',
        'surface-overlay': '#161718',
        'surface-dim':     '#121315',
        surface:           '#121315',
        'surface-container':       '#1F2021',
        'surface-container-high':  '#292A2B',
        'surface-container-highest':'#343536',
        // Text
        'on-surface':         '#E3E2E3',
        'on-surface-variant': '#C6C5D5',
        'text-muted':         '#8B93A1',
        // Primary (electric periwinkle)
        primary:            '#BDC2FF',
        'primary-container':'#5E6AD2',
        'on-primary':       '#121F8B',
        'on-primary-container': '#FDFAFF',
        // Secondary (cyan)
        secondary:            '#5DE6FF',
        'secondary-container':'#00CBE6',
        'on-secondary':       '#00363E',
        // Tertiary (amber)
        tertiary:           '#FFB867',
        // Borders
        outline:            '#908F9E',
        'outline-variant':  '#454652',
        // Error
        'error':            '#FFB4AB',
        'error-container':  '#93000A',
      },
      fontFamily: {
        geist: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        inter: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono:  ['var(--font-jetbrains-mono)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm:      '0.25rem',
        DEFAULT: '0.5rem',
        md:      '0.75rem',
        lg:      '1rem',
        xl:      '1.5rem',
        full:    '9999px',
      },
      boxShadow: {
        // Elevation overlay
        overlay: '0 20px 40px rgba(0,0,0,0.4)',
        // Primary action glow
        'glow-primary': '0 0 15px rgba(94,106,210,0.2)',
        // Focus/hover accent
        'glow-accent': '0 0 20px rgba(94,106,210,0.3)',
      },
      backgroundImage: {
        // Brand gradient: primary → secondary
        'brand': 'linear-gradient(to right, #BDC2FF, #5DE6FF)',
        // Subtle radial glow for card hover
        'glow-radial': 'radial-gradient(ellipse at top, rgba(94,106,210,0.15) 0%, transparent 60%)',
      },
    },
  },
  plugins: [],
};

export default config;
