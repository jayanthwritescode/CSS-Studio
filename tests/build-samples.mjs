import { mkdir, writeFile } from 'node:fs/promises';
import { SAMPLES, sampleTemplate } from '../js/samples/projects.js';
await mkdir(new URL('../assets/samples/', import.meta.url), { recursive: true });
for (const sample of SAMPLES) {
  await writeFile(new URL(`../assets/samples/${sample.id}.motionlab.json`, import.meta.url), `${JSON.stringify(sampleTemplate(sample.id), null, 2)}\n`);
}
console.log('Three editable sample projects generated.');
