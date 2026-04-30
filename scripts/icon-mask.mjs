// Build a macOS-style "squircle" icon from ./assets/icon.src.png.
// macOS Big Sur uses a superellipse (G2-continuous rounded rect) with
// content occupying ~80% of the canvas — the surrounding 10% margin is
// what makes Dock icons feel grouped and consistent.
//
// We approximate this with:
//   - 1024×1024 transparent canvas
//   - 824×824 content area (≈80%)
//   - rounded-rect mask with radius ≈18% of canvas (185px)
//
// Output: ./assets/icon.png (overwrites — this is what `npm run icons` reads).

import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(import.meta.url), "../..");
const SRC = path.join(ROOT, "assets/icon.src.png");
const OUT = path.join(ROOT, "assets/icon.png");

const SIZE = 1024;
const CONTENT = 824;
const PAD = (SIZE - CONTENT) / 2;
const RADIUS = 185;

const mask = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
     <rect x="${PAD}" y="${PAD}" width="${CONTENT}" height="${CONTENT}"
           rx="${RADIUS}" ry="${RADIUS}" fill="white"/>
   </svg>`,
);

const content = await sharp(SRC)
  .resize(CONTENT, CONTENT, { fit: "cover" })
  .png()
  .toBuffer();

await sharp({
  create: {
    width: SIZE,
    height: SIZE,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite([
    { input: content, top: PAD, left: PAD },
    { input: mask, blend: "dest-in" },
  ])
  .png()
  .toFile(OUT);

console.log(`✓ wrote ${OUT}  (${SIZE}×${SIZE}, squircle, ${CONTENT}px content)`);
