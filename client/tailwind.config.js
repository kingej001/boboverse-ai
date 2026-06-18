/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        space: "#0B0F1F",
        spaceDeep: "#070A14",
        solstice: "#F2A93B",
        solsticeLight: "#FFD37A",
        ember: "#E85D4E",
        violet: "#5B4B8A",
        violetDeep: "#3B2F61",
        starlight: "#E8E6F0",
        starlightDim: "#9A97AD",
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        "solstice-gradient": "linear-gradient(135deg, #F2A93B 0%, #E85D4E 100%)",
        "night-gradient": "linear-gradient(180deg, #0B0F1F 0%, #070A14 100%)",
      },
      boxShadow: {
        glow: "0 0 40px rgba(242, 169, 59, 0.25)",
        glowSm: "0 0 20px rgba(242, 169, 59, 0.15)",
      },
      keyframes: {
        twinkle: {
          "0%, 100%": { opacity: 0.2 },
          "50%": { opacity: 1 },
        },
        rise: {
          "0%": { transform: "translateY(20px)", opacity: 0 },
          "100%": { transform: "translateY(0)", opacity: 1 },
        },
      },
      animation: {
        twinkle: "twinkle 3s ease-in-out infinite",
        rise: "rise 0.6s ease-out forwards",
      },
    },
  },
  plugins: [],
};
