import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        dark: "#060A0C",
        "dark-muted": "#5E5E5E",
        gray: "#A5A6A5",
        light: "#ECECEC",
        muted: "#CDCDCD",
        success: "#027A48",
        error: "#B42318",
        warning: "#F79009",
        info: "#0055D6",
      },
      keyframes: {
        scale: {
          "0%": {
            transform: "scale(0,0)",
          },
          "10%": {
            transform: "scale(1,1)",
          },
          "43.333333%": {
            transform: "scale(1,1)",
          },
          "50%": {
            transform: "scale(0,0)",
          },
          "60%": {
            transform: "scale(1,1)",
          },
          "93.333333%": {
            transform: "scale(1,1)",
          },
          "100%": {
            transform: "scale(0,0)",
          },
        },
        "reverse-spin": {
          from: {
            transform: "rotate(360deg)",
          },
        },
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        scale: "scale 3s linear infinite normal forwards",
        "reverse-spin": "reverse-spin 1s linear infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("tailwindcss-animation-delay"),
  ],
} satisfies Config;

export default config;
