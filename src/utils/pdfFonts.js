/**
 * Vietnamese font loader for jsPDF
 * Loads Roboto fonts that support Vietnamese diacritics
 */

let fontsLoaded = false;
let fontCache = {};

async function loadFontAsBase64(url) {
  if (fontCache[url]) return fontCache[url];
  
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  
  // Convert to base64
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  fontCache[url] = base64;
  return base64;
}

export async function registerVietnameseFonts(doc) {
  if (fontsLoaded) {
    // Fonts are already in VFS for the current doc context if this is the same doc, 
    // but jsPDF doc instances are usually fresh.
    // However, the base64 data is cached globally in fontCache.
  }

  try {
    const regular = await loadFontAsBase64('/fonts/Roboto-Regular.ttf');
    const bold = await loadFontAsBase64('/fonts/Roboto-Bold.ttf');
    const italic = await loadFontAsBase64('/fonts/Roboto-Italic.ttf');

    doc.addFileToVFS('Roboto-Regular.ttf', regular);
    doc.addFileToVFS('Roboto-Bold.ttf', bold);
    doc.addFileToVFS('Roboto-Italic.ttf', italic);

    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
    doc.addFont('Roboto-Italic.ttf', 'Roboto', 'italic');

    console.log('✅ Vietnamese fonts registered successfully');
    fontsLoaded = true;
  } catch (err) {
    console.error('❌ Failed to load Vietnamese fonts:', err);
    // No alert here to avoid blocking UI, the generatePDF will catch it.
    throw err;
  }
}
