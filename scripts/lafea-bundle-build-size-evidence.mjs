#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ASSETS = path.join(ROOT, 'dist/assets');
const LOG = path.join(ROOT, 'test-results/lafea-production-build.log');
const OUTPUT = path.join(ROOT, 'test-results/lafea-bundle-build-size-evidence.json');
const CEILING = 1_179_648;
const BASELINE = 1_205_227;

const files = fs.existsSync(ASSETS)
  ? fs.readdirSync(ASSETS).filter((name) => name.endsWith('.js')).map((name) => ({
      name,
      bytes: fs.statSync(path.join(ASSETS, name)).size,
    })).sort((a, b) => b.bytes - a.bytes || a.name.localeCompare(b.name))
  : [];
const main = files.find((row) => /^main-[^/]+\.js$/u.test(row.name)) ?? null;
const view = files.find((row) => /^load-calc-consumer-view-[^/]+\.js$/u.test(row.name)) ?? null;
const log = fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8') : '';
const circularWarnings = log.split(/\r?\n/u).filter((line) => /circular|cycle|tdz|before initialization/iu.test(line));
const evidence = {
  schema: 'lafea-bundle-build-size-evidence/v1',
  hardCeilingBytes: CEILING,
  exactMainBaselineBytes: BASELINE,
  mainChunk: main,
  loadCalcConsumerViewChunk: view,
  reductionVsExactMainBytes: main ? BASELINE - main.bytes : null,
  remainingOverCeilingBytes: main ? Math.max(0, main.bytes - CEILING) : null,
  marginUnderCeilingBytes: main ? Math.max(0, CEILING - main.bytes) : null,
  circularWarningCount: circularWarnings.length,
  circularWarnings,
  largestJsChunks: files.slice(0, 20),
};
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
