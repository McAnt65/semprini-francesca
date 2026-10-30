import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = await readFile(join(root, "assets", "pwa-icon-source.png"));
const hash = createHash("sha256").update(source).digest("hex").toUpperCase();
assert.equal(hash, "2256A800FB1D34C1C343464F562059C05090D878B46A14C92144F32F2F7802C7");
const { data, info } = await sharp(source).removeAlpha().raw().toBuffer({ resolveWithObject: true });
assert.deepEqual([info.width, info.height, info.channels], [1254, 1254, 3]);
const { width, height } = info;
const pixels = width * height;
const exterior = new Uint8Array(pixels);
const queue = new Int32Array(pixels);
let head = 0;
let tail = 0;

function dark(position) {
  const offset = position * 3;
  return data[offset] + data[offset + 1] + data[offset + 2] < 585;
}
function addExterior(position) {
  if (!exterior[position] && dark(position)) {
    exterior[position] = 1;
    queue[tail++] = position;
  }
}
for (let x = 0; x < width; x += 1) {
  addExterior(x);
  addExterior((height - 1) * width + x);
}
for (let y = 0; y < height; y += 1) {
  addExterior(y * width);
  addExterior(y * width + width - 1);
}
while (head < tail) {
  const position = queue[head++];
  const x = position % width;
  if (x > 0) addExterior(position - 1);
  if (x < width - 1) addExterior(position + 1);
  if (position >= width) addExterior(position - width);
  if (position < pixels - width) addExterior(position + width);
}
assert.ok(tail > 100000 && tail < 450000, `Unexpected dark exterior size: ${tail}`);

// Extend the ivory paper into the original dark corners without altering
// the books, flowers, pen or lettering.
const cleaned = Buffer.from(data);
const filled = new Uint8Array(pixels);
head = 0;
tail = 0;
function copyColor(target, origin) {
  const to = target * 3;
  const from = origin * 3;
  cleaned[to] = cleaned[from];
  cleaned[to + 1] = cleaned[from + 1];
  cleaned[to + 2] = cleaned[from + 2];
}
function neighbors(position) {
  const x = position % width;
  return [
    x > 0 ? position - 1 : -1,
    x < width - 1 ? position + 1 : -1,
    position >= width ? position - width : -1,
    position < pixels - width ? position + width : -1,
  ];
}
for (let position = 0; position < pixels; position += 1) {
  if (!exterior[position]) continue;
  const origin = neighbors(position).find((candidate) => candidate >= 0 && !exterior[candidate]);
  if (origin !== undefined) {
    copyColor(position, origin);
    filled[position] = 1;
    queue[tail++] = position;
  }
}
while (head < tail) {
  const position = queue[head++];
  for (const neighbor of neighbors(position)) {
    if (neighbor >= 0 && exterior[neighbor] && !filled[neighbor]) {
      copyColor(neighbor, position);
      filled[neighbor] = 1;
      queue[tail++] = neighbor;
    }
  }
}
assert.equal(tail, exterior.reduce((count, value) => count + value, 0));
const smoothed = await sharp(cleaned, { raw: { width, height, channels: 3 } })
  .blur(24).raw().toBuffer();
for (let position = 0; position < pixels; position += 1) {
  if (!exterior[position]) continue;
  const offset = position * 3;
  cleaned[offset] = smoothed[offset];
  cleaned[offset + 1] = smoothed[offset + 1];
  cleaned[offset + 2] = smoothed[offset + 2];
}
const master = await sharp(cleaned, { raw: { width, height, channels: 3 } })
  .png({ compressionLevel: 9 }).toBuffer();

async function resized(size) {
  return sharp(master).resize(size, size, { kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9 }).toBuffer();
}
async function maskable(size) {
  // Android's centered safe circle has a 40% radius. At 75% size the books,
  // flowers and pen fit inside while the launcher can crop the outer ivory.
  const artworkSize = Math.round(size * 0.75);
  const inset = Math.floor((size - artworkSize) / 2);
  const feather = Math.max(5, Math.round(artworkSize * 0.12));
  const { data: artwork, info: artworkInfo } = await sharp(master)
    .resize(artworkSize, artworkSize, { kernel: sharp.kernel.lanczos3 })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let y = 0; y < artworkSize; y += 1) {
    for (let x = 0; x < artworkSize; x += 1) {
      const distance = Math.min(x, y, artworkSize - 1 - x, artworkSize - 1 - y);
      artwork[(y * artworkSize + x) * artworkInfo.channels + 3] =
        Math.round(255 * Math.min(1, distance / feather));
    }
  }
  const layer = await sharp(artwork, { raw: {
    width: artworkSize, height: artworkSize, channels: artworkInfo.channels,
  } }).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 3, background: "#f6e6c7" } })
    .composite([{ input: layer, left: inset, top: inset }])
    .flatten({ background: "#f6e6c7" }).removeAlpha()
    .png({ compressionLevel: 9 }).toBuffer();
}

await writeFile(join(root, "public", "icona-app-192.png"), await resized(192));
await writeFile(join(root, "public", "icona-app-512.png"), await resized(512));
await writeFile(join(root, "public", "icona-app-maskable-192.png"), await maskable(192));
await writeFile(join(root, "public", "icona-app-maskable-512.png"), await maskable(512));
await writeFile(join(root, "app", "icon.png"), await resized(192));
await writeFile(join(root, "app", "apple-icon.png"), await resized(180));

const faviconSizes = [16, 32, 48, 256];
const faviconImages = await Promise.all(faviconSizes.map(async (size) =>
  sharp(await resized(size)).ensureAlpha().png().toBuffer()));
const header = Buffer.alloc(6 + 16 * faviconImages.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(faviconImages.length, 4);
let offset = header.length;
for (let index = 0; index < faviconImages.length; index += 1) {
  const size = faviconSizes[index];
  const entry = 6 + 16 * index;
  header.writeUInt8(size === 256 ? 0 : size, entry);
  header.writeUInt8(size === 256 ? 0 : size, entry + 1);
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(faviconImages[index].length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += faviconImages[index].length;
}
await writeFile(join(root, "app", "favicon.ico"), Buffer.concat([header, ...faviconImages]));
console.log(`Icone generate dalla sorgente approvata: ${hash}`);
