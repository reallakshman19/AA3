import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildBm4lCommonReportParity } from './lfea-m047-bm4l-common-report-parity.mjs';

function argumentValue(name) {
  const argv = process.argv.slice(2);
  const index = argv.indexOf(name);
  if (index < 0 || index + 1 >= argv.length) {
    throw new TypeError(`Missing required diagnostics argument ${name}.`);
  }
  return argv[index + 1];
}

const corePath = fileURLToPath(new URL('./lfea-m047-bm4l-root-cause-diagnostics-core.mjs', import.meta.url));
const core = spawnSync(process.execPath, [corePath, ...process.argv.slice(2)], {
  cwd: process.cwd(),
  encoding: 'utf8',
  stdio: 'inherit',
});
if (core.error) throw core.error;
if (core.status !== 0) {
  throw new Error(`BM4_L diagnostics core exited ${core.status}.`);
}

const actualPath = resolve(argumentValue('--actual'));
const reportPath = resolve(argumentValue('--report'));
const outPath = resolve(argumentValue('--out'));
const actual = JSON.parse(readFileSync(actualPath, 'utf8'));
const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const diagnostics = JSON.parse(readFileSync(outPath, 'utf8'));
const commonReportParity = await buildBm4lCommonReportParity(actual, report);

writeFileSync(
  outPath,
  `${JSON.stringify({ ...diagnostics, commonReportParity }, null, 2)}\n`,
  'utf8',
);
console.log(`Augmented BM4_L diagnostics with pinned Common report parity: ${outPath}`);
