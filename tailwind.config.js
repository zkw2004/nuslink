/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./constants/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#D4471C",
          50: "#FDF1EE",
          100: "#FAE0D9",
          200: "#F4BEB2",
          300: "#ED9C8A",
          400: "#E67A63",
          500: "#D4471C",
          600: "#A93816",
          700: "#7F2A11",
          800: "#541C0B",
          900: "#2A0E06",
        },
        accent: {
          DEFAULT: "#4A90D9",
          50: "#EEF5FC",
          100: "#D9E9F8",
          200: "#B3D3F1",
          300: "#8DBDEA",
          400: "#67A7E3",
          500: "#4A90D9",
          600: "#2B73BD",
          700: "#215891",
          800: "#163C64",
          900: "#0B2037",
        },
      },
    },
  },
  plugins: [],
};
