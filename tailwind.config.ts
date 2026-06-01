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
        // All colors reference CSS variables so they adapt to dark/light themes.
        // Space-separated RGB format enables Tailwind opacity modifiers (e.g. bg-primary/10).
        'surface-base':              'rgb(var(--surface-base) / <alpha-value>)',
        'surface-raised':            'rgb(var(--surface-raised) / <alpha-value>)',
        'surface-overlay':           'rgb(var(--surface-overlay) / <alpha-value>)',
        'surface-dim':               'rgb(var(--surface-dim) / <alpha-value>)',
        'surface-container':         'rgb(var(--surface-container) / <alpha-value>)',
        'surface-container-high':    'rgb(var(--surface-container-high) / <alpha-value>)',
        'surface-container-highest': 'rgb(var(--surface-container-highest) / <alpha-value>)',
        'on-surface':                'rgb(var(--on-surface) / <alpha-value>)',
        'on-surface-variant':        'rgb(var(--on-surface-variant) / <alpha-value>)',
        'text-muted':                'rgb(var(--text-muted) / <alpha-value>)',
        primary:                     'rgb(var(--primary) / <alpha-value>)',
        'primary-container':         'rgb(var(--primary-container) / <alpha-value>)',
        'on-primary':                'rgb(var(--on-primary) / <alpha-value>)',
        'on-primary-container':      'rgb(var(--on-primary-container) / <alpha-value>)',
        secondary:                   'rgb(var(--secondary) / <alpha-value>)',
        'secondary-container':       'rgb(var(--secondary-container) / <alpha-value>)',
        'on-secondary':              'rgb(var(--on-secondary) / <alpha-value>)',
        tertiary:                    'rgb(var(--tertiary) / <alpha-value>)',
        outline:                     'rgb(var(--outline) / <alpha-value>)',
        'outline-variant':           'rgb(var(--outline-variant) / <alpha-value>)',
        error:                       'rgb(var(--error) / <alpha-value>)',
        'error-container':           'rgb(var(--error-container) / <alpha-value>)',
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
        overlay:       '0 20px 40px rgba(0,0,0,0.4)',
        'glow-primary': '0 0 15px var(--glow-primary-color)',
        'glow-accent':  '0 0 20px var(--glow-accent-color)',
      },
      backgroundImage: {
        brand:        'linear-gradient(to right, var(--brand-from), var(--brand-to))',
        'glow-radial': 'radial-gradient(ellipse at top, var(--glow-accent-color) 0%, transparent 60%)',
      },
    },
  },
  plugins: [],
};

export default config;
