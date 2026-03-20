/**
 * Steady brand theme tokens.
 * Single source of truth for colors used across web (CSS vars) and mobile (inline styles).
 *
 * Web: these values are mirrored as CSS custom properties (--steady-*) in globals.css.
 * Mobile: import directly for React Native inline styles.
 * AI: passed to Claude API so generated HTML uses var(--steady-*) references.
 */

export const theme = {
  teal: "#5B8A8A",
  tealLight: "#7BA3A3",
  tealDark: "#4A7272",
  tealBg: "#E3EDED",

  sky: "#89B4C8",
  skyLight: "#A8CBDA",

  sage: "#8FAE8B",
  sageLight: "#A8C3A5",
  sageDark: "#729070",
  sageBg: "#E8F0E7",

  rose: "#D4A0A0",
  roseLight: "#E0BABA",
  roseBg: "#F5E6E6",

  cream: "#F5ECD7",
  creamLight: "#FAF6ED",
  creamDark: "#E8DCC2",

  warm50: "#F7F5F2",
  warm100: "#F0EDE8",
  warm200: "#D4D0CB",
  warm300: "#8A8A8A",
  warm400: "#5A5A5A",
  warm500: "#2D2D2D",
} as const;

export type ThemeColors = typeof theme;

/**
 * CSS custom property names matching globals.css.
 * Use these when building inline styles for AI-generated HTML.
 */
export const cssVars = {
  teal: "var(--steady-teal)",
  tealLight: "var(--steady-teal-light)",
  tealDark: "var(--steady-teal-dark)",
  tealBg: "var(--steady-teal-bg)",
  sky: "var(--steady-sky)",
  skyLight: "var(--steady-sky-light)",
  sage: "var(--steady-sage)",
  sageLight: "var(--steady-sage-light)",
  sageDark: "var(--steady-sage-dark)",
  sageBg: "var(--steady-sage-bg)",
  rose: "var(--steady-rose)",
  roseLight: "var(--steady-rose-light)",
  roseBg: "var(--steady-rose-bg)",
  cream: "var(--steady-cream)",
  creamLight: "var(--steady-cream-light)",
  creamDark: "var(--steady-cream-dark)",
  warm50: "var(--steady-warm-50)",
  warm100: "var(--steady-warm-100)",
  warm200: "var(--steady-warm-200)",
  warm300: "var(--steady-warm-300)",
  warm400: "var(--steady-warm-400)",
  warm500: "var(--steady-warm-500)",
} as const;
