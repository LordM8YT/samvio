const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function compressImage(file: File, maxDimension = 2200, targetBytes = 2_500_000) {
  if (!ACCEPTED_TYPES.has(file.type)) throw new Error('Velg et bilde i JPG-, PNG- eller WebP-format.');
  if (file.size > 25 * 1024 * 1024) throw new Error('Bildet kan være maks 25 MB.');

  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Nettleseren kunne ikke klargjøre bildet.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality = 0.84;
  let blob: Blob | null = null;
  do {
    blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    quality -= 0.12;
  } while (blob && blob.size > targetBytes && quality >= 0.48);
  if (!blob) throw new Error('Bildet kunne ikke komprimeres.');
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'bilde';
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
}
