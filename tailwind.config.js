/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        clinical: {
          50: "#f0f7f6",
          100: "#d9ebe8",
          500: "#2f7a70",
          600: "#256258",
          700: "#1d4d46",
        },
      },
    },
  },
  plugins: [],
};
