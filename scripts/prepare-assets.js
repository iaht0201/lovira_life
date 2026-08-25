import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function decodeBase64ToImage(txtRelativePath, outRelativePath) {
  const txtFullPath = path.join(rootDir, txtRelativePath);
  const outFullPath = path.join(rootDir, outRelativePath);

  if (!fs.existsSync(txtFullPath)) {
    console.warn('[Prepare Assets] Missing source text file:', txtRelativePath);
    return;
  }

  try {
    const raw = fs.readFileSync(txtFullPath, 'utf8').trim();
    const b64 = raw.replace(/^data:image\/[a-zA-Z0-9+-]+;base64,/, '');
    const buf = Buffer.from(b64, 'base64');
    
    // Ensure parent dir exists
    const dir = path.dirname(outFullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outFullPath, buf);
    console.log(`[Prepare Assets] Successfully decoded ${outRelativePath} (${buf.length} bytes, Magic: ${buf.subarray(0, 4).toString('hex')})`);
  } catch (err) {
    console.error(`[Prepare Assets] Error decoding ${txtRelativePath}:`, err);
  }
}

// Ensure brand directory exists
const brandDir = path.join(rootDir, 'public/brand');
if (!fs.existsSync(brandDir)) {
  fs.mkdirSync(brandDir, { recursive: true });
}

// Generate valid binary PNGs from base64 sources
decodeBase64ToImage('public/logo.txt', 'public/brand/logo.png');
decodeBase64ToImage('public/logo.txt', 'public/brand/logo-icon.png');
decodeBase64ToImage('public/logo.txt', 'public/brand/logo_client.png');
decodeBase64ToImage('public/logo.txt', 'public/brand/client.png');
decodeBase64ToImage('public/avatar.txt', 'public/brand/avatar.png');
decodeBase64ToImage('public/banner.txt', 'public/brand/banner.png');

console.log('[Prepare Assets] Asset decoding complete.');
