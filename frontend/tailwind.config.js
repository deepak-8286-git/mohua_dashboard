/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy:  { DEFAULT: "#0A1628", 800: "#0D1B2E", 700: "#111C2D", 600: "#12202F", 500: "#162033", 400: "#1A2A40", 300: "#2B4069" },
        slate: { 700: "#3A4E63", 600: "#4A5E75", 500: "#5A7090", 400: "#7A8FA8", 300: "#B8C8DC", 100: "#E8EDF5" },
        amber: { DEFAULT: "#E8813A" },
        nz:    "#4F9CF9",
        sz:    "#E8813A",
        wz:    "#38B089",
        ez:    "#D94F3D",
      },
      fontFamily: {
        display: ["Rajdhani", "sans-serif"],
        body:    ["Inter", "sans-serif"],
        mono:    ["JetBrains Mono", "monospace"],
      },
      keyframes: {
        pulseLine: {
          "0%, 100%": { opacity: "1" },
          "50%":       { opacity: "0.15" },
        },
      },
      animation: {
        "pulse-line": "pulseLine 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
}
