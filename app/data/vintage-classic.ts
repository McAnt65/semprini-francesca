/** Deterministic, browser-only Vintage classico v5 treatment. */
export async function createVintageClassic(original: Blob): Promise<Blob> {
  if (!original.type.startsWith("image/") || !original.size) throw new Error("Fotografia non valida.");
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(original, { imageOrientation: "from-image" }); }
  catch { throw new Error("Non riesco a decodificare la fotografia."); }
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Memoria insufficiente per elaborare la fotografia.");
    context.drawImage(bitmap, 0, 0, width, height);
    const image = context.getImageData(0, 0, width, height);
    const pixels = image.data;
    const luminance = new Uint8Array(width * height);
    for (let index = 0; index < luminance.length; index++) {
      const offset = index * 4;
      luminance[index] = Math.round(.2126 * pixels[offset] + .7152 * pixels[offset + 1] + .0722 * pixels[offset + 2]);
    }
    for (let y = 0; y < height; y += 32) {
      for (let row = y; row < Math.min(height, y + 32); row++) {
        for (let x = 0; x < width; x++) {
          const index = row * width + x;
          const offset = index * 4;
          const r = pixels[offset], g = pixels[offset + 1], b = pixels[offset + 2];
          const lum = luminance[index];
          const edge = x > 0 && row > 0 && x < width - 1 && row < height - 1
            ? Math.min(1, (Math.abs(lum - luminance[index - 1]) + Math.abs(lum - luminance[index - width])) / 125) : 0;
          const paper = (((x * 37 + row * 61) % 101) / 100 - .5) * 2.2;
          const tone = (lum - 128) * .94 + 128;
          pixels[offset] = Math.max(0, Math.min(255, .76 * r + .24 * tone + 3.8 - edge * 3.2 + paper));
          pixels[offset + 1] = Math.max(0, Math.min(255, .78 * g + .22 * tone + 2.1 - edge * 3.5 + paper));
          pixels[offset + 2] = Math.max(0, Math.min(255, .79 * b + .21 * tone - 2.3 - edge * 3.8 + paper));
        }
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
    context.putImageData(image, 0, 0);
    const result = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", .88));
    canvas.width = canvas.height = 0;
    if (!result) throw new Error("Non riesco a creare il ritratto vintage.");
    return result;
  } finally { bitmap.close(); }
}
