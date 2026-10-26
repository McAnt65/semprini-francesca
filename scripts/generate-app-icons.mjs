import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "CopertineAppDef", "IconaAppDefinitiva.png");
const original = await readFile(source);
const hash = createHash("sha256").update(original).digest("hex").toUpperCase();
assert.equal(hash, "443C1EB1806565199CC3A308EBA877DE582080ADC73369D443B1E55A596B1680");
const metadata = await sharp(original).metadata();
assert.equal(metadata.width, 1254);
assert.equal(metadata.height, 1254);

async function resized(size, rgba = false) {
  const pipeline = sharp(original).resize(size, size, { kernel: sharp.kernel.lanczos3 });
  return (rgba ? pipeline.ensureAlpha() : pipeline)
    .png({ compressionLevel: 9 }).toBuffer();
}

const icon192 = await resized(192);
const icon512 = await resized(512);
// The 344 px artwork keeps the books and principal flowers inside the
// centered 40% radius safe zone required for a 512 px maskable icon.
const maskableArtwork = await resized(344);
const maskable512 = await sharp({ create: {
  width: 512, height: 512, channels: 3, background: "#fefdfd",
} }).composite([{ input: maskableArtwork, left: 84, top: 84 }])
  .flatten({ background: "#fefdfd" })
  .removeAlpha()
  .png({ compressionLevel: 9 }).toBuffer();

await writeFile(join(root, "public", "icona-app-192.png"), icon192);
await writeFile(join(root, "public", "icona-app-512.png"), icon512);
await writeFile(join(root, "public", "icona-app-maskable-512.png"), maskable512);

// Next.js file conventions also set the tab and Apple home-screen icons.
await writeFile(join(root, "app", "icon.png"), icon192);
await writeFile(join(root, "app", "apple-icon.png"), await resized(180));

const faviconSizes = [16, 32, 48, 256];
const faviconImages = await Promise.all(faviconSizes.map(size => resized(size, true)));
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
console.log("Icone generate dall'originale verificato:", hash);
