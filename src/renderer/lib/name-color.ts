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
// the first time it appears in roster, and keeps that color forever in
// this session. Never shifts when peers leave, so log entries stay stable.
const assignments = new Map<string, number>();
let nextIndex = 0;

roster.subscribe((participants) => {
  for (const p of participants) {
    if (!assignments.has(p.name)) {
      assignments.set(p.name, nextIndex++);
    }
  }
});

function hashIndex(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function nameColor(name: string): string {
  const idx = assignments.get(name);
  if (idx !== undefined) return PALETTE[idx % PALETTE.length];
  // Names not in current roster (e.g. "all", historical participants):
  // deterministic hash fallback. May collide once palette is exhausted.
  return PALETTE[hashIndex(name) % PALETTE.length];
}
