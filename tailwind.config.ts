import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        slate: {
          925: "#0d1420",
        },
      },
    },
  },
  plugins: [],
};

export default config;
