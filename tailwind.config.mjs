import { heroui } from "@heroui/react";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{astro,html,js,ts,jsx,tsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
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
    },
  })],
}
