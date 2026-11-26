import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const distDir = resolve('dist');
const targetAssetsDir = resolve('app/src/main/assets/public');

if (!existsSync(distDir)) {
  throw new Error('dist/ directory not found. Run "npm run build" first.');
}

rmSync(targetAssetsDir, { recursive: true, force: true });
mkdirSync(targetAssetsDir, { recursive: true });
cpSync(distDir, targetAssetsDir, { recursive: true });

console.log(`Synced offline web bundle from ${distDir} to ${targetAssetsDir}`);
