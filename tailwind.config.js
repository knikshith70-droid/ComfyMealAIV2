import defaultTheme from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#FBF8F3",
          100: "#F6F1E8",
          200: "#EFE7D6",
          300: "#E5D9C2",
        },
        sage: {
          50: "#F2F5EF",
          100: "#E2E9DC",
          200: "#C7D4BD",
          300: "#A6BB98",
          400: "#85A074",
          500: "#6B8A5A",
          600: "#557047",
          700: "#445A39",
          800: "#374930",
          900: "#2D3B29",
        },
        clay: {
          50: "#FAF1EB",
          100: "#F3E0D4",
          200: "#E8C3AC",
          300: "#D9A082",
          400: "#C77E58",
          500: "#B0623C",
          600: "#934E2E",
          700: "#763E26",
          800: "#5C3220",
          900: "#472819",
        },
        charcoal: {
          700: "#3A3530",
          800: "#2A2622",
          900: "#1E1B18",
        },
      },
      fontFamily: {
        serif: ['"Fraunces"', '"Cormorant Garamond"', ...defaultTheme.fontFamily.serif],
        sans: ['"Inter"', ...defaultTheme.fontFamily.sans],
      },
      boxShadow: {
        soft: "0 2px 12px -2px rgba(60, 50, 40, 0.08), 0 8px 28px -8px rgba(60, 50, 40, 0.10)",
        card: "0 1px 3px rgba(60, 50, 40, 0.06), 0 12px 32px -12px rgba(60, 50, 40, 0.14)",
        ring: "0 0 0 3px rgba(133, 160, 116, 0.35)",
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.4rem",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "pop": {
          "0%": { transform: "scale(0.96)", opacity: "0" },
          "60%": { transform: "scale(1.01)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "shimmer": {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.4s ease both",
        "pop": "pop 0.35s cubic-bezier(0.22, 1, 0.36, 1) both",
        "shimmer": "shimmer 1.6s infinite",
      },
    },
  },
  plugins: [],
};
