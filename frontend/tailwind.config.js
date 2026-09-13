/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#080C14",
          900: "#0E1420",
          800: "#162030",
          750: "#1A2538",
          700: "#243040",
          600: "#2E3C50",
          500: "#3A4A60",
        },
        paper: "#E8E2D0",
        paperdim: "#DAD3BC",
        amber: {
          DEFAULT: "#D9A441",
          dim: "#a87c30",
        },
        teal: {
          DEFAULT: "#4FB6A6",
          dim: "#357a6e",
        },
        rust: {
          DEFAULT: "#C1503D",
          dim: "#8a3628",
        },
        indigo: "#7C93C9",
        text: {
          DEFAULT: "#C9D1D9",
          dim: "#7C8697",
          muted: "#4A5568",
        },
        glass: {
          DEFAULT: "rgba(255,255,255,0.04)",
          border: "rgba(255,255,255,0.07)",
          hover: "rgba(255,255,255,0.08)",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'IBM Plex Sans'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "sidebar-glow": "linear-gradient(180deg, rgba(217,164,65,0.12) 0%, transparent 60%)",
      },
      boxShadow: {
        "glow-amber": "0 0 20px rgba(217,164,65,0.15), 0 0 40px rgba(217,164,65,0.05)",
        "glow-teal": "0 0 20px rgba(79,182,166,0.15), 0 0 40px rgba(79,182,166,0.05)",
        "glow-rust": "0 0 20px rgba(193,80,61,0.15)",
        "card": "0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)",
        "card-hover": "0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(217,164,65,0.2)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "spin-slow": "spin 8s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
}
