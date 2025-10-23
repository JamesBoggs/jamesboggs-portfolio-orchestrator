/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
      },
      colors: {
        tiffany: "#81D8D0",
      },
      boxShadow: {
        card: "0 10px 20px rgba(0,0,0,0.25)",
      },
    },
  },
  plugins: [],
};
