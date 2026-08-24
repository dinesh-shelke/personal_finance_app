#!/usr/bin/env node
/**
 * Generates every launcher, splash and favicon image from one vector mark.
 *
 * Run `npm run icons` after changing the palette or the geometry below. The
 * SVGs written into `assets/brand/` are the reviewable source; the PNGs in
 * `assets/images/` are build output that `app.config.ts` points at.
 *
 * Colours are read out of `src/theme/tokens.ts` rather than repeated here, so
 * the README's "no component hard-codes a colour" rule covers the icons too.
 */
import { Buffer } from 'node:buffer';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BRAND_DIR = path.join(root, 'assets', 'brand');
const IMAGE_DIR = path.join(root, 'assets', 'images');
const TOKENS = path.join(root, 'src', 'theme', 'tokens.ts');

/** The mark is drawn on a 1024 grid and scaled down from there. */
const CANVAS = 1024;
/** Corner radius of the app tile — 22% of the canvas reads as a squircle. */
const TILE_RADIUS = 224;
/**
 * Android guarantees only the central 66/108 of an adaptive icon is visible,
 * and themed (monochrome) icons are cropped to that same circle. 0.86 keeps
 * the mark's diagonal inside it with room to spare.
 */
const SAFE_SCALE = 0.86;
/**
 * The legacy tile is not masked to a circle, so the mark can breathe closer to
 * the corners there than the adaptive foreground is allowed to.
 */
const TILE_SCALE = 1.15;

/**
 * Three pills of rising height: the ledger going up. Heights are deliberately
 * uneven (192 / 320 / 480) so the shape still reads as growth at 48px, where
 * a gentler ramp would flatten out.
 */
const BAR_WIDTH = 128;
const BARS = [
  { x: 256, y: 560, height: 192 },
  { x: 448, y: 432, height: 320 },
  { x: 640, y: 272, height: 480 },
];

async function readPalette() {
  const source = await readFile(TOKENS, 'utf8');
  const pick = (name) => {
    const match = source.match(new RegExp(`^ *${name}: *'(#[0-9A-Fa-f]{6})'`, 'm'));
    if (!match) {
      throw new Error(
        `src/theme/tokens.ts no longer defines a hex colour named "${name}". ` +
          `Update scripts/generate-icons.mjs to match.`,
      );
    }
    return match[1];
  };
  return {
    surface: pick('surface'),
    primary: pick('primary'),
    positive: pick('positive'),
  };
}

/** @param fillFor maps a bar's index to its fill colour. */
function bars(fillFor) {
  return BARS.map(
    (bar, i) =>
      `<rect x="${bar.x}" y="${bar.y}" width="${BAR_WIDTH}" height="${bar.height}" ` +
      `rx="${BAR_WIDTH / 2}" fill="${fillFor(i)}" />`,
  ).join('\n    ');
}

/** Scales the mark about the canvas centre. */
function scaled(children, scale) {
  const offset = (CANVAS / 2) * (1 - scale);
  return `<g transform="translate(${offset} ${offset}) scale(${scale})">\n    ${children}\n  </g>`;
}

function document(body) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" ` +
    `viewBox="0 0 ${CANVAS} ${CANVAS}">\n  ${body}\n</svg>\n`
  );
}

function build(palette) {
  // Two white pills and one mint: the tallest bar borrows the "income" colour
  // so the mark carries the same meaning the app's badges do.
  const onTile = (i) => (i === BARS.length - 1 ? palette.positive : palette.surface);

  const tile =
    `<rect width="${CANVAS}" height="${CANVAS}" rx="${TILE_RADIUS}" fill="${palette.primary}" />\n  ` +
    scaled(bars(onTile), TILE_SCALE);

  return {
    // Full-bleed tile: the legacy launcher icon, the splash logo and the favicon.
    'icon.svg': document(tile),
    // Adaptive foreground. The tile colour moves to `adaptiveIcon.backgroundColor`
    // in app.config.ts, so only the mark is drawn here.
    'icon-foreground.svg': document(scaled(bars(onTile), SAFE_SCALE)),
    // Themed icons are recoloured by the launcher; only the alpha matters.
    'icon-monochrome.svg': document(
      scaled(
        bars(() => '#000000'),
        SAFE_SCALE,
      ),
    ),
  };
}

/** [source svg, output png, pixel size] */
const OUTPUTS = [
  ['icon.svg', 'icon.png', 1024],
  ['icon-foreground.svg', 'android-icon-foreground.png', 1024],
  ['icon-monochrome.svg', 'android-icon-monochrome.png', 1024],
  ['icon.svg', 'splash-icon.png', 512],
  ['icon.svg', 'favicon.png', 48],
];

async function main() {
  const palette = await readPalette();
  const sources = build(palette);

  await mkdir(BRAND_DIR, { recursive: true });
  for (const [name, contents] of Object.entries(sources)) {
    await writeFile(path.join(BRAND_DIR, name), contents, 'utf8');
    console.log(`  vector  assets/brand/${name}`);
  }

  for (const [source, output, size] of OUTPUTS) {
    const svg = Buffer.from(sources[source]);
    await sharp(svg, { density: 384 })
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(IMAGE_DIR, output));
    console.log(`  raster  assets/images/${output}  ${size}x${size}`);
  }
}

await main();
