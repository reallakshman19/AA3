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
const loadCalcView = files.find((row) => /^load-calc-consumer-view-[^/]+\.js$/u.test(row.name)) ?? null;
const discretizationGeneration = files.find(
  (row) => /^lafea-discretization-generation-[^/]+\.js$/u.test(row.name),
) ?? null;
const log = fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8') : '';
const circularWarnings = log.split(/\r?\n/u).filter((line) => /circular|cycle|tdz|before initialization/iu.test(line));
const evidence = {
  schema: 'lafea-bundle-build-size-evidence/v2',
  hardCeilingBytes: CEILING,
  exactMainBaselineBytes: BASELINE,
  mainChunk: main,
  loadCalcConsumerViewChunk: loadCalcView,
  lafeaDiscretizationGenerationChunk: discretizationGeneration,
  expectedBoundedChunksPresent: Boolean(loadCalcView && discretizationGeneration),
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

if (!main) throw new Error('BUNDLE_EVIDENCE_MAIN_CHUNK_MISSING');
if (!loadCalcView) throw new Error('BUNDLE_EVIDENCE_LOAD_CALC_VIEW_CHUNK_MISSING');
if (!discretizationGeneration) throw new Error('BUNDLE_EVIDENCE_DISCRETIZATION_GENERATION_CHUNK_MISSING');
