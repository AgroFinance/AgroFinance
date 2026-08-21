import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Core palette
        'agrofinance': {
          'bg-primary': '#020D09',
          'bg-secondary': '#061A12',
          'bg-tertiary': '#0A2318',
          'emerald-deep': '#064E3B',
          'emerald-mid': '#065F46',
          'emerald': '#059669',
          'mint': '#10B981',
          'mint-light': '#34D399',
          'glow': '#6EE7B7',
          'blue': '#0EA5E9',
          'blue-light': '#38BDF8',
          'amber': '#F59E0B',
          'red': '#EF4444',
          'text-primary': '#F0FDF4',
          'text-secondary': '#A7F3D0',
          'text-muted': '#6EE7B7',
          'glass-bg': 'rgba(6, 78, 59, 0.15)',
          'glass-border': 'rgba(52, 211, 153, 0.15)',
          'card-bg': 'rgba(6, 26, 18, 0.8)',
          'neon': '#00FFB3',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'display-xl': ['6rem', { lineHeight: '1.05', letterSpacing: '-0.04em' }],
        'display-lg': ['4.5rem', { lineHeight: '1.08', letterSpacing: '-0.03em' }],
        'display-md': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.025em' }],
        'display-sm': ['2.5rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-emerald': 'linear-gradient(135deg, #064E3B 0%, #020D09 100%)',
        'gradient-glow': 'radial-gradient(ellipse at center, rgba(16, 185, 129, 0.15) 0%, transparent 70%)',
        'mesh-pattern': `
          radial-gradient(at 40% 20%, rgba(16, 185, 129, 0.08) 0px, transparent 50%),
          radial-gradient(at 80% 0%, rgba(6, 78, 59, 0.12) 0px, transparent 50%),
          radial-gradient(at 0% 50%, rgba(14, 165, 233, 0.06) 0px, transparent 50%),
          radial-gradient(at 80% 50%, rgba(16, 185, 129, 0.06) 0px, transparent 50%),
          radial-gradient(at 0% 100%, rgba(6, 78, 59, 0.08) 0px, transparent 50%)
        `,
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(16, 185, 129, 0.25)',
        'glow-md': '0 0 25px rgba(16, 185, 129, 0.3)',
        'glow-lg': '0 0 50px rgba(16, 185, 129, 0.25)',
        'glow-xl': '0 0 80px rgba(16, 185, 129, 0.2)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.5), 0 1px 0 rgba(52, 211, 153, 0.1) inset',
        'blue-glow': '0 0 30px rgba(14, 165, 233, 0.25)',
        'neon-glow': '0 0 20px rgba(0, 255, 179, 0.4)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 9s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out infinite 2s',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'gradient-shift': 'gradientShift 8s ease infinite',
        'spin-slow': 'spin 20s linear infinite',
        'blink': 'blink 4s ease-in-out infinite',
        'scan': 'scan 2s linear infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'reveal-up': 'revealUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'orbit': 'orbit 15s linear infinite',
        'orbit-reverse': 'orbit 20s linear infinite reverse',
        'particle-drift': 'particleDrift 20s linear infinite',
        'typing': 'typing 1.5s steps(30, end) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '33%': { transform: 'translateY(-12px) rotate(1deg)' },
          '66%': { transform: 'translateY(-6px) rotate(-0.5deg)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        blink: {
          '0%, 90%, 100%': { transform: 'scaleY(1)' },
          '95%': { transform: 'scaleY(0.1)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        revealUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        orbit: {
          '0%': { transform: 'rotate(0deg) translateX(120px) rotate(0deg)' },
          '100%': { transform: 'rotate(360deg) translateX(120px) rotate(-360deg)' },
        },
        particleDrift: {
          '0%': { transform: 'translateY(100vh) translateX(0px)', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { transform: 'translateY(-100px) translateX(50px)', opacity: '0' },
        },
        typing: {
          '0%': { width: '0' },
          '70%': { width: '100%' },
          '80%, 100%': { width: '100%' },
        },
      },
      backdropBlur: {
        'xs': '2px',
        'glass': '20px',
        'heavy': '40px',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'expo-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '100': '25rem',
        '112': '28rem',
        '128': '32rem',
      },
    },
  },
  plugins: [],
}

export default config
