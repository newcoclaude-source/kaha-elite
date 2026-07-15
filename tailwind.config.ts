import type { Config } from "tailwindcss";

// Kaha Elite — paleta CLARA (redesign PLANO_DESIGN): fundo claro, sidebar preta,
// vermelho de marca. Mantemos os nomes antigos (bg/surface/border/text/…) remapeados
// para o claro — as telas já feitas re-tematizam sozinhas — e adicionamos os nomes
// novos do plano (card/ink/line/red/…). Disciplina do vermelho: marca=vermelho,
// atenção=âmbar, risco=vermelho ESCURO (risk). Nunca red puro para "perigo".
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Nomes antigos, remapeados para o claro ──
        bg: "#F4F4F5", // fundo da página
        surface: "#FFFFFF", // = card
        "surface-2": "#F1F1F3", // = line-2 (superfície sutil / inputs)
        border: "#E7E7EA", // = line
        text: "#0A0A0C", // = ink
        muted: "#71717A",
        "muted-2": "#A1A1AA",
        brand: {
          DEFAULT: "#E11D2E", // = red
          hover: "#FF3D4D",
        },
        ok: "#15A34A",
        warn: "#D97706",
        risk: "#B91C1C",
        confirmed: "#2563EB", // = blue

        // ── Nomes novos do PLANO_DESIGN ──
        card: "#FFFFFF",
        ink: {
          DEFAULT: "#0A0A0C",
          2: "#3F3F46",
        },
        line: {
          DEFAULT: "#E7E7EA",
          2: "#F1F1F3",
        },
        red: {
          DEFAULT: "#E11D2E",
          hover: "#FF3D4D",
          soft: "#FEF2F3",
        },
        "ok-soft": "#F0FDF4",
        "warn-soft": "#FFFBEB",
        blue: {
          DEFAULT: "#2563EB",
          soft: "#EFF6FF",
        },
        zap: "#25D366", // verde do WhatsApp (só no botão de enviar)
      },
      fontFamily: {
        display: ["var(--font-archivo)", "system-ui", "sans-serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderColor: {
        DEFAULT: "#E7E7EA",
      },
      borderRadius: {
        card: "16px",
        shell: "20px",
      },
    },
  },
  plugins: [],
};

export default config;
