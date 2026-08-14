/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        sapphire: {
          950: "#050A14",
          900: "#080E1A",
          850: "#0C1527",
          800: "#0F1D38",
          750: "#142546",
          700: "#1A2E56",
          600: "#243E74",
          500: "#32549C",
        },
        navy: {
          DEFAULT: "#0A1628",
          800: "#0D1B2E",
          700: "#111C2D",
          600: "#12202F",
          500: "#162033",
          400: "#1A2A40",
          300: "#2B4069",
        },
        brand: {
          amber: "#F9A55A",
          gold: "#F59E0B",
          emerald: "#10B981",
          cyan: "#06B6D4",
          rose: "#F43F5E",
          purple: "#8B5CF6",
          blue: "#3B82F6",
        },
        nz: "#38BDF8", // North Zone - Cyan / Sky Blue
        sz: "#FB923C", // South Zone - Vibrant Amber Orange
        wz: "#34D399", // West Zone - Emerald Green
        ez: "#F87171", // East Zone - Coral Red
      },
      fontFamily: {
        display: ["Rajdhani", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      keyframes: {
        pulseLine: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.2" },
        },
      },
      animation: {
        "pulse-line": "pulseLine 2s ease-in-out infinite",
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glow-amber': '0 0 25px -5px rgba(249, 165, 90, 0.3)',
        'glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.3)',
        'glow-cyan': '0 0 25px -5px rgba(6, 182, 212, 0.3)',
        'glow-rose': '0 0 25px -5px rgba(244, 63, 94, 0.3)',
      },
    },
  },
  plugins: [],
}
