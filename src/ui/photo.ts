/*
 * Player photos: square, cropped slightly above center (faces), shrunk on
 * the iPhone to under 60 KB so they fit in saved data and backups.
 */
const MAX_BYTES = 60_000;

export async function shrinkPhoto(file: Blob): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  // Slightly above center: heads sit in the top half of most photos.
  const sy = (bitmap.height - side) * 0.35;
  let size = 256;
  let quality = 0.82;
  for (;;) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    canvas.getContext('2d')!.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
    const url = canvas.toDataURL('image/jpeg', quality);
    // Base64 is 4 bytes for every 3.
    if ((url.length - url.indexOf(',') - 1) * 0.75 < MAX_BYTES || size <= 96) return url;
    if (quality > 0.55) quality -= 0.1;
    else size = Math.round(size * 0.8);
  }
}
