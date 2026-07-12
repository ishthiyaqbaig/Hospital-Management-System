/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        medical: {
          blue: "#1769aa",
          cyan: "#1aa6b7",
          teal: "#0f766e",
          mint: "#d9f7ef",
          ice: "#eef9fb",
          navy: "#12355b",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 16px 48px rgba(18, 53, 91, 0.12)",
      },
    },
  },
  plugins: [],
};
