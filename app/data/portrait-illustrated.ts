/** A soft illustrated portrait made entirely with local Canvas 2D operations. */
export async function createIllustratedPortrait(original: Blob, variation = 0): Promise<Blob> {
  if (!original.type.startsWith("image/") || !original.size) throw new Error("Fotografia non valida.");
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(original, { imageOrientation: "from-image" }); }
  catch { throw new Error("Non riesco a decodificare la fotografia."); }
  try {
    const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Memoria insufficiente per elaborare la fotografia.");
    context.drawImage(bitmap, 0, 0, width, height);
    const source = context.getImageData(0, 0, width, height);

    // Two local soft layers smooth broad tones while the original keeps facial details.
    const soft = document.createElement("canvas");
    soft.width = width; soft.height = height;
    const softContext = soft.getContext("2d", { willReadFrequently: true });
    if (!softContext) throw new Error("Memoria insufficiente per elaborare la fotografia.");
    softContext.filter = `blur(${Math.max(2, width / 450)}px)`;
    softContext.drawImage(canvas, 0, 0);
    const smooth = softContext.getImageData(0, 0, width, height).data;
    softContext.clearRect(0, 0, width, height);
    softContext.filter = `blur(${Math.max(5, width / 150)}px)`;
    softContext.drawImage(canvas, 0, 0);
    const atmosphere = softContext.getImageData(0, 0, width, height).data;
    const paperCanvas = document.createElement("canvas");
    paperCanvas.width = Math.max(2, Math.ceil(width / 5));
    paperCanvas.height = Math.max(2, Math.ceil(height / 5));
    const paperContext = paperCanvas.getContext("2d");
    if (!paperContext) throw new Error("Memoria insufficiente per elaborare la fotografia.");
    const paperDots = paperContext.createImageData(paperCanvas.width, paperCanvas.height);
    for (let index = 0; index < paperDots.data.length; index += 4) {
      const cell = index / 4;
      const noise = ((cell * 1103515245 + Math.floor(cell / paperCanvas.width) * 12345 + variation * 1013) >>> 8) % 256;
      paperDots.data[index] = paperDots.data[index + 1] = paperDots.data[index + 2] = 116 + Math.round(noise * 24 / 255);
      paperDots.data[index + 3] = 255;
    }
    paperContext.putImageData(paperDots, 0, 0);
    softContext.filter = "none";
    softContext.clearRect(0, 0, width, height);
    softContext.imageSmoothingEnabled = true;
    softContext.drawImage(paperCanvas, 0, 0, width, height);
    const paper = softContext.getImageData(0, 0, width, height).data;
    const pixels = source.data;
    const originalPixels = new Uint8ClampedArray(pixels);
    const phase = ((variation % 3) + 3) % 3;
    const warmth = [1.5, 2.5, .7][phase];
    const soften = [.72, .76, .67][phase];
    const clamp = (value: number) => Math.max(0, Math.min(255, value));

    for (let y = 0; y < height; y += 24) {
      for (let row = y; row < Math.min(height, y + 24); row++) {
        for (let x = 0; x < width; x++) {
          const offset = (row * width + x) * 4;
          const left = (row * width + Math.max(0, x - 1)) * 4;
          const above = (Math.max(0, row - 1) * width + x) * 4;
          const edge = Math.min(1, (
            Math.abs(originalPixels[offset] - originalPixels[left]) +
            Math.abs(originalPixels[offset + 1] - originalPixels[left + 1]) +
            Math.abs(originalPixels[offset + 2] - originalPixels[left + 2]) +
            Math.abs(originalPixels[offset] - originalPixels[above]) +
            Math.abs(originalPixels[offset + 1] - originalPixels[above + 1])
          ) / 220);
          const dx = (x / width - .5) * 2;
          const dy = (row / height - .46) * 2;
          const outer = Math.min(1, Math.max(0, (Math.hypot(dx, dy) - .48) / .75));
          const blend = Math.min(.76, soften * (1 - edge * .63) + outer * .13);
          const background = outer * .42;
          const edgeInk = edge * (1 - outer * .6) * 5;
          const texture = (paper[offset] - 128) * 0.28;
          for (let channel = 0; channel < 3; channel++) {
            const index = offset + channel;
            const base = originalPixels[index] * (1 - blend) + smooth[index] * blend;
            const softened = base * (1 - background) + atmosphere[index] * background;
            // Shared soft tonal planes make the treatment legible without hard posterization.
            const grouped = Math.round(softened / 36) * 36;
            const painted = softened * .36 + grouped * .64;
            const tint = channel === 0 ? warmth : channel === 1 ? warmth * .45 : -warmth * .55;
            pixels[index] = clamp((painted - 128) * .97 + 132 + tint - edgeInk + texture);
          }
        }
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
    context.putImageData(source, 0, 0);
    const result = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", .9));
    canvas.width = canvas.height = soft.width = soft.height = paperCanvas.width = paperCanvas.height = 0;
    if (!result) throw new Error("Non riesco a creare il ritratto illustrato.");
    return result;
  } finally { bitmap.close(); }
}
