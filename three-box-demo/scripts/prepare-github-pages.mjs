import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const distDirectory = resolve(process.cwd(), 'dist');
const noJekyllFile = resolve(distDirectory, '.nojekyll');

await mkdir(distDirectory, { recursive: true });
await writeFile(noJekyllFile, '', 'utf8');

console.log(`Prepared GitHub Pages artifact: ${noJekyllFile}`);
