// Generates the Android launcher icons and splash screens from Almirah's mark (the two-door cupboard in
// src/app/icon.svg), replacing the Capacitor template images. Rerun when the real logo arrives.
// Usage: node scripts/make-android-icons.mjs
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const RES = "android/app/src/main/res";
const ACCENT = "#7a1f3d";
const SURFACE = "#f5f6f8";

// The glyph drawn in a 64-unit box, white on transparent.
const glyph = `
  <rect x="17" y="12" width="30" height="40" rx="3" fill="none" stroke="#ffffff" stroke-width="4"/>
  <line x1="32" y1="12" x2="32" y2="52" stroke="#ffffff" stroke-width="4"/>
  <circle cx="27.5" cy="33" r="2.4" fill="#ffffff"/>
  <circle cx="36.5" cy="33" r="2.4" fill="#ffffff"/>`;

const fullIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${ACCENT}"/>${glyph}</svg>`;
const roundIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="${ACCENT}"/>${glyph}</svg>`;
// Adaptive icon foreground: 108-unit canvas, glyph kept inside the central 66-unit safe zone.
const foreground = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108"><g transform="translate(54 54) scale(1.05) translate(-32 -32)">${glyph}</g></svg>`;

const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

const png = (svg, size) => sharp(Buffer.from(svg), { density: 72 * (size / 64) * 4 }).resize(size, size).png().toBuffer();

for (const [d, k] of Object.entries(DENSITIES)) {
  const dir = join(RES, `mipmap-${d}`);
  writeFileSync(join(dir, "ic_launcher.png"), await png(fullIcon, Math.round(48 * k)));
  writeFileSync(join(dir, "ic_launcher_round.png"), await png(roundIcon, Math.round(48 * k)));
  writeFileSync(join(dir, "ic_launcher_foreground.png"), await png(foreground, Math.round(108 * k)));
}

writeFileSync(
  join(RES, "values", "ic_launcher_background.xml"),
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${ACCENT.toUpperCase()}</color>\n</resources>\n`,
);

// Splash screens: the app icon centred on the app's background colour, at each existing size.
const splashDirs = readdirSync(RES).filter((d) => d === "drawable" || d.startsWith("drawable-port") || d.startsWith("drawable-land"));
let splashes = 0;
for (const d of splashDirs) {
  const file = join(RES, d, "splash.png");
  let meta;
  try {
    meta = await sharp(file).metadata();
  } catch {
    continue; // this drawable folder has no splash
  }
  const side = Math.round(Math.min(meta.width, meta.height) * 0.28);
  const icon = await png(fullIcon, side);
  const out = await sharp({ create: { width: meta.width, height: meta.height, channels: 4, background: SURFACE } })
    .composite([{ input: icon, gravity: "center" }])
    .png()
    .toBuffer();
  writeFileSync(file, out);
  splashes++;
}

console.log(`icons: ${Object.keys(DENSITIES).length} densities × 3; splash screens: ${splashes}`);
