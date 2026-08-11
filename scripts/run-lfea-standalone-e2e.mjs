import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const playwrightCli = path.join(ROOT, 'node_modules', '@playwright', 'test', 'cli.js');
const spec = 'e2e/lfea-standalone.spec.js';

const result = spawnSync(process.execPath, [playwrightCli, 'test', spec], {
  cwd: ROOT,
  encoding: 'utf8',
  stdio: 'inherit',
});

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
console.log('LFEA standalone browser journey PASS.');
