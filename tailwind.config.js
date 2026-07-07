/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: { center: true },
    extend: {
      colors: {
        // 品牌主色：深邃蓝（专业、信任）
        brand: {
          50: "#eff4ff",
          100: "#dbe7fe",
          200: "#bfd3fe",
          300: "#93b4fd",
          400: "#6090fa",
          500: "#3b6df6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },
        // 辅助色：暖金（奖励、成就、活力）
        gold: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },
        // 墨色文字
        ink: {
          50: "#f8f9fb",
          100: "#f1f3f7",
          200: "#e2e5ea",
          300: "#cbd0d9",
          400: "#9aa3b2",
          500: "#6b7280",
          600: "#525a6b",
          700: "#3d4456",
          800: "#272d40",
          900: "#1a1f36",
          950: "#0f1322",
        },
        // 五大引擎标识色
        engine: {
          practice: "#7c3aed",   // 刻意练习 - 紫
          reading: "#db2777",    // 海绵阅读 - 粉
          deep: "#059669",       // 深度工作 - 绿
          action: "#d97706",     // 知行转化 - 橙
          critical: "#0891b2",   // 批判思维 - 青
        },
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', "system-ui", "sans-serif"],
        display: ['"Noto Sans SC"', '"PingFang SC"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', '"Fira Code"', "monospace"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(26,31,54,0.06), 0 1px 2px 0 rgba(26,31,54,0.04)",
        cardHover: "0 8px 24px -4px rgba(26,31,54,0.12), 0 4px 8px -2px rgba(26,31,54,0.06)",
        glow: "0 0 0 4px rgba(37,99,235,0.12)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: { "0%": { opacity: "0", transform: "translateY(12px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        scaleIn: { "0%": { opacity: "0", transform: "scale(0.95)" }, "100%": { opacity: "1", transform: "scale(1)" } },
      },
    },
  },
  plugins: [],
};
