import type { Config } from "tailwindcss";

// Tokens extraídos do mock KahaElite_v4.html — fonte da verdade visual.
// Dark mode only. Não adicionar cores fora desta paleta sem discutir.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Fundo e superfícies
        bg: "#0A0A0C",
        surface: "#121215",
        "surface-2": "#1A1A1F",
        border: "#26262D",
        // Texto
        text: "#F5F5F6",
        muted: "#96969E",
        "muted-2": "#5D5D66",
        // Marca (CT Kaha)
        brand: {
          DEFAULT: "#E11D2E",
          hover: "#FF3D4D",
        },
        // Estados / semáforo
        ok: "#2FD07A", // verde
        warn: "#F5A623", // âmbar (atenção)
        risk: "#FF5A68", // risco
        confirmed: "#4DA6FF", // azul (confirmado)
      },
      fontFamily: {
        // Títulos: Archivo 800/900, uppercase, itálico. Corpo: Inter.
        display: ["var(--font-archivo)", "system-ui", "sans-serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderColor: {
        DEFAULT: "#26262D",
      },
    },
  },
  plugins: [],
};

export default config;
