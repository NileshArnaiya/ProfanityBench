/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        gaali: {
          bg: "#0A0A0A",
          surface: "#141414",
          card: "#1C1C1C",
          border: "#2A2A2A",
          red: "#FF3B30",
          orange: "#FF6B35",
          gold: "#FFAA00",
          text: "#E8E8E8",
          muted: "#777777",
          dim: "#444444",
        },
      },
      fontFamily: {
        display: ['"Permanent Marker"', "cursive"],
        body: ['"Lexend"', "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
    },
  },
  plugins: [],
};
