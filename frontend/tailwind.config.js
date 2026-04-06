/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'oklch(0.98 0 0)',
        foreground: 'oklch(0.2 0 0)',
        card: 'oklch(0.99 0 0)',
        'card-foreground': 'oklch(0.2 0 0)',
        primary: 'oklch(0.83 0.25 300)',
        'primary-foreground': 'oklch(0.2 0 0)',
        secondary: 'oklch(0.97 0 0)',
        'secondary-foreground': 'oklch(0.32 0 0)',
        muted: 'oklch(0.96 0 0)',
        'muted-foreground': 'oklch(0.45 0 0)',
        accent: 'oklch(0.95 0 0)',
        'accent-foreground': 'oklch(0.2 0 0)',
        destructive: 'oklch(0.7 0.2 30)',
        'destructive-foreground': 'oklch(0.1 0 0)',
        border: 'oklch(0.9 0 0)',
        input: 'oklch(0.95 0 0)',
        ring: 'oklch(0.83 0.25 300)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow': '0 0 15px rgba(139, 92, 246, 0.5)',
        'glow-lg': '0 0 25px rgba(139, 92, 246, 0.6)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}
