/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
      './src/components/**/*.{js,ts,jsx,tsx,mdx}',
      './src/app/**/*.{js,ts,jsx,tsx,mdx}',
      './pages/**/*.{js,ts,jsx,tsx,mdx}',
      './components/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    darkMode: 'class',
    theme: {
      extend: {
        colors: {
          primary: {
            DEFAULT: '#2563EB', // Royal Blue
            light: '#60A5FA', // Sky
          },
          accent: {
            DEFAULT: '#22d3ee', // Cyan
            dark: '#06B6D4',
          },
          navy: {
            DEFAULT: '#0f172a', // Navy Dark
            deep: '#020617', // Navy Deep
          },
          muted: {
            DEFAULT: '#f1f5f9',
            foreground: '#64748b',
          }
        },
        fontFamily: {
          cairo: ['Cairo', 'sans-serif'],
          jakarta: ['Plus Jakarta Sans', 'sans-serif'],
          fustat: ['Fustat', 'sans-serif'],
        },
        backgroundImage: {
          'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
          'gradient-conic':
            'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
          'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='white' fill-opacity='0.03' fill-rule='evenodd'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E\")",
        },
        animation: {
          'fade-in': 'fadeIn 0.6s ease-out forwards',
          'fade-in-right': 'fadeInRight 0.6s ease-out forwards',
          'slide-up': 'slideUp 0.8s ease-out forwards',
          'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        },
        keyframes: {
          fadeIn: {
            '0%': { opacity: '0', transform: 'translateY(20px)' },
            '100%': { opacity: '1', transform: 'translateY(0)' },
          },
          fadeInRight: {
            '0%': { opacity: '0', transform: 'translateX(20px)' },
            '100%': { opacity: '1', transform: 'translateX(0)' },
          },
          slideUp: {
            '0%': { opacity: '0', transform: 'translateY(40px)' },
            '100%': { opacity: '1', transform: 'translateY(0)' },
          }
        },
        boxShadow: {
          'glow': '0 0 20px rgba(37, 99, 235, 0.3)',
          'glow-accent': '0 0 20px rgba(34, 211, 238, 0.3)',
        }
      },
    },
    plugins: [],
  }
  