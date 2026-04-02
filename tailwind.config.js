/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Cabinet Grotesk"', '"DM Sans"', 'sans-serif'],
        body:    ['"DM Sans"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        // Zinc/Slate palette as specified
        surface: {
          950: '#09090b',
          900: '#101012',
          800: '#18181b',
          700: '#27272a',
          600: '#3f3f46',
        },
        accent: {
          DEFAULT: '#38bdf8', // sky-400
          dim:     'rgba(56,189,248,0.12)',
          border:  'rgba(56,189,248,0.22)',
        },
      },
      animation: {
        'fade-up':   'fadeUp 0.38s ease-out both',
        'fade-in':   'fadeIn 0.25s ease-out both',
        'scale-in':  'scaleIn 0.3s cubic-bezier(0.16,1,0.3,1) both',
        'slide-down':'slideDown 0.36s cubic-bezier(0.16,1,0.3,1) both',
        'pulse-dot': 'pulseDot 2.4s ease-in-out infinite',
        'spin-slow': 'spin 2s linear infinite',
      },
      keyframes: {
        fadeUp:    { from:{opacity:0,transform:'translateY(10px)'}, to:{opacity:1,transform:'none'} },
        fadeIn:    { from:{opacity:0}, to:{opacity:1} },
        scaleIn:   { from:{opacity:0,transform:'scale(0.93)'}, to:{opacity:1,transform:'scale(1)'} },
        slideDown: { from:{opacity:0,maxHeight:0,transform:'translateY(-6px)'}, to:{opacity:1,maxHeight:'900px',transform:'none'} },
        pulseDot:  { '0%,100%':{opacity:1}, '50%':{opacity:0.35} },
      },
    },
  },
  plugins: [],
};
