import { roster } from "./stores/roster.ts";

// Perceptually-uniform palette in OKLCH: same lightness + chroma,
// only hue varies. Reads as a curated set, not random hex picks.
const PALETTE = [
  "oklch(0.76 0.085 20)",   // terracotta
  "oklch(0.76 0.085 50)",   // sand
  "oklch(0.76 0.085 80)",   // ochre
  "oklch(0.76 0.085 110)",  // moss
  "oklch(0.76 0.085 140)",  // sage
  "oklch(0.76 0.085 170)",  // mint
  "oklch(0.76 0.085 200)",  // fog
  "oklch(0.76 0.085 230)",  // dusk
  "oklch(0.76 0.085 260)",  // periwinkle
  "oklch(0.76 0.085 290)",  // plum
  "oklch(0.76 0.085 320)",  // rosewood
  "oklch(0.76 0.085 350)",  // coral
  "oklch(0.66 0.085 50)",   // bronze (darker tier)
  "oklch(0.66 0.085 170)",  // teal
  "oklch(0.66 0.085 290)",  // wine
];

// First-seen assignment: each name gets the next available palette slot
// the first time it is asked about (by any caller), and keeps that color
// for the rest of the session. Locking on first call — rather than only
// when roster arrives — keeps the agent tab bar, chat sender labels, and
// @mention pills all in agreement even when one renders before the
// roster broadcast lands.
const assignments = new Map<string, number>();
let nextIndex = 0;

function indexFor(name: string): number {
  let idx = assignments.get(name);
  if (idx === undefined) {
    idx = nextIndex++;
    assignments.set(name, idx);
  }
  return idx;
}

// Pre-assign in roster order when a roster broadcast arrives so colors
// usually follow join order. Lazy assignment in nameColor() handles the
// race where a component renders before the broadcast.
roster.subscribe((participants) => {
  for (const p of participants) indexFor(p.name);
});

export function nameColor(name: string): string {
  return PALETTE[indexFor(name) % PALETTE.length];
}
