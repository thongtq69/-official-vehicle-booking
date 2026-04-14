/**
 * Vietnamese font loader for jsPDF
 * Fetches Roboto fonts from public/fonts/ directory
 */

const fontCache = {};

async function loadFontAsBase64(url) {
  if (fontCache[url]) return fontCache[url];

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Font fetch failed: ${response.status} ${url}`);
  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // Verify it's a real font file (TTF starts with 0x00010000)
  if (bytes.length < 4 || bytes[0] !== 0 || bytes[1] !== 1) {
    throw new Error(`Invalid font file at ${url} (got ${bytes.length} bytes, header: ${bytes[0]},${bytes[1]})`);
  }

  // Convert to base64 in chunks
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  const base64 = btoa(binary);
  fontCache[url] = base64;
  return base64;
}

export async function registerVietnameseFonts(doc) {
  const [regular, bold, italic] = await Promise.all([
    loadFontAsBase64('/fonts/Roboto-Regular.ttf'),
    loadFontAsBase64('/fonts/Roboto-Bold.ttf'),
    loadFontAsBase64('/fonts/Roboto-Italic.ttf')
  ]);

  doc.addFileToVFS('Roboto-Regular.ttf', regular);
  doc.addFileToVFS('Roboto-Bold.ttf', bold);
  doc.addFileToVFS('Roboto-Italic.ttf', italic);

  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
  doc.addFont('Roboto-Italic.ttf', 'Roboto', 'italic');
}
