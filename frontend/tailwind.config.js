/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0E1116",
          900: "#161B22",
          800: "#1F2630",
          700: "#2B3340",
        },
        paper: "#E8E2D0",
        paperdim: "#DAD3BC",
        amber: "#D9A441",
        teal: "#4FB6A6",
        rust: "#C1503D",
        text: {
          DEFAULT: "#C9D1D9",
          dim: "#7C8697",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'IBM Plex Sans'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
    },
  },
  plugins: [],
}

