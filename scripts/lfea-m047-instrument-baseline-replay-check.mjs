#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/u, '$1'));
const SCRIPT = resolve(ROOT, 'scripts/lfea-m047-instrument-baseline-replay.mjs');
const fixtureLines = [
  'const evidence = {',
  '      elementLedger: analysis.elements.map((entry) => ({',
  '        elementId: entry.elementId,',
  '        gravityWeightN: entry.gravityWeightN,',
  '      })),',
  '};',
];

function exercise(eol, label) {
  const root = mkdtempSync(join(tmpdir(), `m047-replay-${label.toLowerCase()}-`));
  try {
    const source = join(root, 'caesar-accdb-linear-solve.js');
    const manifest = join(root, 'manifest.json');
    writeFileSync(source, fixtureLines.join(eol), 'utf8');
    const result = spawnSync(process.execPath, [SCRIPT, '--source', source, '--manifest', manifest], {
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const changed = readFileSync(source, 'utf8');
    const evidence = JSON.parse(readFileSync(manifest, 'utf8'));
    assert.match(changed, /replayElementContribution: Object\.freeze/u);
    assert.equal(evidence.detectedLineEnding, label);
    assert.equal(evidence.numericalExecutionChanged, false);
    assert.equal((changed.match(/replayElementContribution/gu) ?? []).length, 1);
    assert.equal(changed.includes(eol), true);
    process.stdout.write(`M047-I008-INSTR-${label} PASS\n`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

exercise('\n', 'LF');
exercise('\r\n', 'CRLF');
process.stdout.write('lfea-m047-instrument-baseline-replay-check: PASS\n');
