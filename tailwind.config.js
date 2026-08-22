/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#fdfbf8',
          100: '#faf5ee',
          200: '#f3e9d8',
          300: '#ead7ba',
        },
        rose: {
          50: '#fdf3f4',
          100: '#fbe6e8',
          200: '#f6cdd1',
          300: '#eda3aa',
          400: '#e0737e',
          500: '#cc4f5d',
          600: '#b73a48',
          700: '#972c39',
          800: '#7c2731',
          900: '#6a252d',
        },
        burgundy: {
          50: '#fdf4f4',
          100: '#fbe5e5',
          200: '#f7caca',
          300: '#efa3a3',
          400: '#e27171',
          500: '#cf4848',
          600: '#b93030',
          700: '#9b2727',
          800: '#7d2222',
          900: '#672020',
        },
        gold: {
          50: '#fbf7ec',
          100: '#f6eed1',
          200: '#ecdca0',
          300: '#e1c66d',
          400: '#d4af37',
          500: '#c49b2e',
          600: '#a87d24',
          700: '#84601f',
          800: '#6b4d20',
          900: '#5a411f',
        },
        charcoal: {
          50: '#f6f6f5',
          100: '#e8e8e6',
          200: '#d1d1cd',
          300: '#ababa5',
          400: '#82827b',
          500: '#666660',
          600: '#50504b',
          700: '#3f3f3b',
          800: '#2a2a27',
          900: '#1a1a18',
        },
      },
      fontFamily: {
        sans: ['Tajawal', 'system-ui', 'sans-serif'],
        display: ['Cairo', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        fadeDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-out',
        scaleIn: 'scaleIn 0.2s ease-out',
      },
    },
  },
  plugins: [],
};
