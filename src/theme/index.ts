// Design tokens — a single source of truth so every screen shares the same
// rhythm, type scale and elevation instead of ad-hoc numbers per file.
// This is what separates a "premium" feel from an ordinary one: consistency.

export const COLORS = {
  // Core burgundy family (from theomy's live web theme)
  burgundy: "#7B1E2B",
  burgundyLight: "#C80C3D",
  burgundyMuted: "#5E0018",
  burgundyDark: "#240007",
  background: "#3D000D",
  ink: "#1A0006", // deepest tone, for gradient tails

  // Warm top-of-screen glow used behind the status bar on Home/Archive
  heroGlow: "#C1532E",
  heroGlowSoft: "#8C2A1E",

  // Gold accents
  gold: "#D4AF37",
  goldLight: "#E8C171",
  goldDim: "rgba(212,175,55,0.16)",

  cream: "#F5EBDD",
  ctaText: "#241014",

  // Archive's own sepia-bronze sub-theme
  archiveBackground: "#4A2A0A",
  archiveMid: "#3A2008",
  archiveDark: "#241404",
  archiveGold: "#D4A244",

  // Surfaces layered over the gradient — translucent so the gradient shows
  // through, which reads as glass rather than flat blocks.
  surface: "rgba(255,255,255,0.06)",
  surfaceStrong: "rgba(255,255,255,0.10)",
  hairline: "rgba(255,255,255,0.12)",
  textMuted: "rgba(245,235,221,0.62)",
  textFaint: "rgba(245,235,221,0.42)",
};

// 4pt base spacing scale — keeps vertical rhythm consistent across screens.
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
};

// Type scale with deliberate steps — the previous UI used near-identical
// sizes everywhere, which flattens hierarchy and looks generic.
export const TYPE = {
  display: { fontSize: 26, fontWeight: "800" as const, letterSpacing: -0.4 },
  title: { fontSize: 20, fontWeight: "800" as const, letterSpacing: -0.2 },
  section: { fontSize: 17, fontWeight: "700" as const, letterSpacing: -0.1 },
  body: { fontSize: 14, fontWeight: "400" as const },
  label: { fontSize: 13, fontWeight: "600" as const },
  caption: { fontSize: 11, fontWeight: "500" as const },
  overline: { fontSize: 10, fontWeight: "700" as const, letterSpacing: 1.2 },
};

export const ELEVATION = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  hero: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },
  bar: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 12,
  },
};
