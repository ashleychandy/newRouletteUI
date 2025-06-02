const defaultTheme = require('tailwindcss/defaultTheme');
const plugin = require('tailwindcss/plugin');

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3CB684',
          50: '#F2FEF9',
          100: '#E2F9F0',
          200: '#C0F0DD',
          300: '#9FE7CB',
          400: '#7EDEB8',
          500: '#3CB684',
          600: '#31A674',
          700: '#278A61',
          800: '#1E6E4D',
          900: '#14523A',
        },
        secondary: {
          DEFAULT: '#F8FAFC',
          50: '#FFFFFF',
          100: '#F8FAFC',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
          950: '#020617',
        },
        gaming: {
          primary: '#3CB684',
          'primary-dark': '#278A61',
          accent: '#4ADE80',
          success: '#10B981',
          error: '#EF4444',
          warning: '#F59E0B',
          info: '#3B82F6',
        },
        win: '#10B981',
        loss: '#EF4444',
        draw: '#F59E0B',
      },
      fontFamily: {
        sans: ['Inter var', ...defaultTheme.fontFamily.sans],
        display: ['Lexend', ...defaultTheme.fontFamily.sans],
        mono: ['Fira Code', ...defaultTheme.fontFamily.mono],
      },
      boxShadow: {
        'glow-sm': '0 0 8px 2px rgba(60, 182, 132, 0.3)',
        glow: '0 0 15px 3px rgba(60, 182, 132, 0.4)',
        'glow-lg': '0 0 25px 5px rgba(60, 182, 132, 0.5)',
        inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
        DEFAULT:
          '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        outline: '0 0 0 3px rgba(66, 153, 225, 0.5)',
        none: 'none',
      },
      backgroundImage: {
        'gradient-gaming':
          'linear-gradient(to right, var(--tw-gradient-from), var(--tw-gradient-to))',
        'gradient-radial':
          'radial-gradient(circle at center, var(--tw-gradient-from), var(--tw-gradient-to))',
        mesh: "url(\"data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h20v20H0V0zm10 10h10v10H10V10zM0 10h10v10H0V10z' fill='%233CB684' fill-opacity='0.05'/%3E%3C/svg%3E\")",
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        float: 'float 3s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'number-change': 'numberChange 0.3s ease-out',
        'Roulette-roll': 'RouletteRoll 1s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.5s ease-out',
        'Roulette-bounce': 'RouletteBounce 0.5s ease-in-out',
        'Roulette-shake': 'RouletteShake 0.5s ease-in-out',
        'number-pop': 'numberPop 0.3s ease-out',
        'result-fade': 'resultFade 0.5s ease-in-out',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'spin-reverse': 'spin 1s linear infinite reverse',
        shake: 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(60, 182, 132, 0.5)' },
          '50%': { boxShadow: '0 0 30px rgba(60, 182, 132, 0.8)' },
        },
        numberChange: {
          '0%': { transform: 'scale(1.2)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        RouletteRoll: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        RouletteBounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        RouletteShake: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-15deg)' },
          '75%': { transform: 'rotate(15deg)' },
        },
        numberPop: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        resultFade: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shake: {
          '10%, 90%': { transform: 'translate3d(-1px, 0, 0)' },
          '20%, 80%': { transform: 'translate3d(2px, 0, 0)' },
          '30%, 50%, 70%': { transform: 'translate3d(-4px, 0, 0)' },
          '40%, 60%': { transform: 'translate3d(4px, 0, 0)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      aspectRatio: {
        square: '1',
        auto: 'auto',
        '4/3': '4 / 3',
        '16/9': '16 / 9',
      },
      gridTemplateColumns: {
        14: 'repeat(14, minmax(0, 1fr))',
      },
      textShadow: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.2)',
        DEFAULT: '0 2px 4px rgba(0, 0, 0, 0.3)',
        lg: '0 3px 6px rgba(0, 0, 0, 0.4)',
        xl: '0 4px 8px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio'),
    require('tailwind-scrollbar'),
    plugin(({ addComponents, addUtilities }) => {
      addComponents({
        '.btn-gaming': {
          '@apply bg-gaming-primary text-white font-bold px-6 py-3 rounded-lg':
            {},
          '@apply transition-all duration-300 text-center': {},
          '@apply disabled:opacity-50 disabled:cursor-not-allowed': {},
          '@apply hover:bg-gaming-primary-dark active:scale-95': {},
          '@apply focus:outline-none focus:ring-2 focus:ring-gaming-primary/50':
            {},
        },
        '.input-gaming': {
          '@apply bg-white border border-secondary-200': {},
          '@apply rounded-lg px-4 py-3 text-secondary-800': {},
          '@apply focus:ring-2 focus:ring-gaming-primary/50 focus:border-transparent':
            {},
          '@apply placeholder-secondary-400': {},
        },
        '.solid-panel': {
          '@apply bg-white rounded-xl': {},
          '@apply border border-secondary-200': {},
          '@apply shadow-md': {},
        },
        '.stat-card': {
          '@apply solid-panel p-4 flex flex-col space-y-2': {},
          '@apply hover:scale-105 transition-transform duration-300': {},
        },
        '.game-card': {
          '@apply solid-panel p-6 flex flex-col space-y-4': {},
          '@apply hover:shadow-glow transition-all duration-300': {},
          '@apply border border-gaming-primary/20': {},
        },
      }),
        addUtilities({
          '.text-gradient': {
            'background-clip': 'text',
            '-webkit-background-clip': 'text',
            color: 'transparent',
            'background-image': 'linear-gradient(to right, #3CB684, #4ADE80)',
          },
          '.scrollbar-gaming': {
            'scrollbar-width': 'thin',
            'scrollbar-color': '#3CB684 #E2E8F0',
          },
        });
    }),
    function ({ matchUtilities, theme }) {
      matchUtilities(
        {
          'text-shadow': value => ({
            textShadow: value,
          }),
        },
        { values: theme('textShadow') }
      );
    },
  ],
};
