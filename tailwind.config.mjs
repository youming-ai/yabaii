import { heroui } from "@heroui/react";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{astro,html,js,ts,jsx,tsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [heroui({
    themes: {
      light: {
        colors: {
          primary: {
            DEFAULT: "#6366f1",
            foreground: "#ffffff",
          },
          secondary: {
            DEFAULT: "#ec4899",
            foreground: "#ffffff",
          },
          focus: "#6366f1",
        },
      },
      dark: {
        colors: {
          primary: {
            DEFAULT: "#818cf8",
            foreground: "#ffffff",
          },
          secondary: {
            DEFAULT: "#f472b6",
            foreground: "#ffffff",
          },
          focus: "#818cf8",
        },
      },
    },
  })],
}
