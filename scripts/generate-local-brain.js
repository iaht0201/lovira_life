import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.resolve(__dirname, '../src/data/localBrain/localBrain.json');
const targetTsPath = path.resolve(__dirname, '../src/services/localBrain/localBrainDataset.generated.ts');

if (!fs.existsSync(jsonPath)) {
  console.error(`❌ Source dataset not found at: ${jsonPath}`);
  process.exit(1);
}

const rawJson = fs.readFileSync(jsonPath, 'utf8');
// Validate JSON syntax
try {
  JSON.parse(rawJson);
} catch (e) {
  console.error('❌ Invalid JSON in localBrain.json:', e);
  process.exit(1);
}

const header = `/**
 * AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.
 * Source of truth: src/data/localBrain/localBrain.json
 * Run \`npm run generate:local-brain\` to regenerate.
 */

import type { LocalBrainDataset } from './localBrainDataset.js';

export const LOCAL_BRAIN_DATASET_GENERATED: LocalBrainDataset = ${rawJson.trim()};
`;

fs.writeFileSync(targetTsPath, header, 'utf8');
console.log(`✅ Generated ${targetTsPath} successfully from ${jsonPath}`);
