// Perceptually-uniform palette in OKLCH: same lightness + chroma,
// only hue varies. Reads as a curated set, not random hex picks.
const PALETTE = [
  "oklch(0.76 0.085 50)",   // sand
  "oklch(0.76 0.085 90)",   // ochre
  "oklch(0.76 0.085 130)",  // moss
  "oklch(0.76 0.085 170)",  // sage
  "oklch(0.76 0.085 210)",  // fog
  "oklch(0.76 0.085 250)",  // dusk
  "oklch(0.76 0.085 290)",  // plum
  "oklch(0.76 0.085 330)",  // rosewood
  "oklch(0.76 0.085 20)",   // terracotta
];

export function nameColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}
