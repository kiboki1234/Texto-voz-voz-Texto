/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#17202a',
        field: '#eef8f4',
        canopy: '#1f7a5c',
        canopyLight: '#e8f5ee',
        water: '#137ea0',
        waterLight: '#e4f0f5',
        harvest: '#c98320',
        harvestLight: '#fdf3e6',
        warning: '#b45309',
        warningLight: '#fef3e7',
        danger: '#b91c1c',
        dangerLight: '#fef2f2',
        soil: '#8B6914',
        soilLight: '#faf6eb',
      },
      fontSize: {
        '2xl': ['1.625rem', { lineHeight: '2.125rem' }],
        '3xl': ['2rem', { lineHeight: '2.5rem' }],
      },
      boxShadow: {
        panel: '0 12px 28px rgba(23, 32, 42, 0.08)',
        card: '0 4px 16px rgba(23, 32, 42, 0.06)',
        alert: '0 4px 24px rgba(185, 28, 28, 0.15)',
      },
      minHeight: {
        touch: '3.5rem',
      },
      minWidth: {
        touch: '3.5rem',
      },
    },
  },
  plugins: [],
};
