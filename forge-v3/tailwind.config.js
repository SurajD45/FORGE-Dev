/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forge: {
          // Core backgrounds
          bg: "#0e0e13",
          "bg-alt": "#131318",
          surface: "#1f1f25",
          "surface-low": "#1b1b20",
          "surface-high": "#2a292f",
          "surface-bright": "#39383e",
          border: "#464554",
          "border-soft": "#35343a",

          // Primary — Indigo
          primary: "#c0c1ff",
          "primary-dim": "#8083ff",
          "primary-h": "#a5a6f6",
          "on-primary": "#1000a9",
          "primary-container": "#8083ff",

          // Secondary — Cyan/Sky
          secondary: "#89ceff",
          "secondary-container": "#00a2e6",

          // Tertiary — Violet
          tertiary: "#cfbcff",
          "tertiary-container": "#7b5fcb",

          // Semantic
          text: "#e4e1e9",
          "on-surface": "#e4e1e9",
          muted: "#c7c4d7",
          "muted-dim": "#908fa0",
          success: "#6dd58c",
          warning: "#ffd966",
          danger: "#ffb4ab",
          "danger-container": "#93000a",
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
        'glass-gradient-strong': 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))',
        'forge-hero': 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(99,102,241,0.22) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(139,92,246,0.15) 0%, transparent 70%)',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideRight: { from: { opacity: '0', transform: 'translateX(-16px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        shimmer: { '0%': { backgroundPosition: '200% 0' }, '100%': { backgroundPosition: '-200% 0' } },
        glowPulse: { '0%, 100%': { boxShadow: '0 0 20px rgba(99,102,241,0.2)' }, '50%': { boxShadow: '0 0 40px rgba(99,102,241,0.5)' } },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        orbitSpin: { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
        blink: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0' } },
        logScroll: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        'fade-in': 'fadeIn 0.35s ease-out forwards',
        'slide-up': 'slideUp 0.45s ease-out forwards',
        'slide-right': 'slideRight 0.35s ease-out forwards',
        'shimmer': 'shimmer 1.8s infinite',
        'glow-pulse': 'glowPulse 2.5s ease-in-out infinite',
        'float': 'float 4s ease-in-out infinite',
        'orbit': 'orbitSpin 12s linear infinite',
        'blink': 'blink 1.2s step-end infinite',
        'log-in': 'logScroll 0.25s ease-out forwards',
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
  ],
}