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
        water: '#137ea0',
        harvest: '#c98320',
        warning: '#b45309',
        danger: '#b42318',
      },
      boxShadow: {
        panel: '0 12px 28px rgba(23, 32, 42, 0.08)',
      },
    },
  },
  plugins: [],
};
