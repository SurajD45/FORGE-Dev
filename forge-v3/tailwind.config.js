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
          bg:        "#0a0a0f",
          surface:   "#12121a",
          border:    "#1e1e2e",
          primary:   "#6366f1",
          primary_h: "#4f46e5",
          accent:    "#a855f7",
          text:      "#e2e8f0",
          muted:     "#64748b",
          success:   "#22c55e",
          warning:   "#f59e0b",
          danger:    "#ef4444",
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
        'glass-gradient-strong': 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))',
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
  ],
}