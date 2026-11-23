/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        card: token('card'),
        ink: token('ink'),
        muted: token('muted'),
        line: token('line'),
        track: token('track'),
        field: token('field'),
        primary: token('primary'),
        'primary-ink': token('primary-ink'),
        'on-primary': token('on-primary'),
        'primary-soft': token('primary-soft'),
        amber: token('amber'),
        'amber-ink': token('amber-ink'),
        'amber-soft': token('amber-soft'),
        coral: token('coral'),
        'coral-ink': token('coral-ink'),
        'coral-soft': token('coral-soft'),
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: 'var(--shadow-card)',
      },
      borderRadius: {
        '2xl': '1.125rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
