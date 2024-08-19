import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
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
    },
  },
  plugins: [],
};
export default config;
