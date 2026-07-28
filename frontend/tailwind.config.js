/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ClickUp branding color scheme
        clickup: {
          primary: "#7b68ee", // ClickUp purple
          pink: "#ff007f",    // ClickUp accent pink
          dark: {
            DEFAULT: "#1e222b", // Main ClickUp dark theme background
            sidebar: "#11141a", // Deep dark sidebar background
            card: "#262b35",    // Card background in dark mode
            border: "#2f3542"   // Dark mode border color
          },
          light: {
            DEFAULT: "#f7f8fa", // ClickUp light workspace background
            sidebar: "#ffffff", // Light mode sidebar
            card: "#ffffff",    // Light mode card
            border: "#e8eaed"   // Light mode border
          },
          text: {
            primary: "#2a3039",
            secondary: "#6f7682",
            muted: "#9aa1a9"
          }
        }
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"]
      }
    },
  },
  plugins: [],
}
