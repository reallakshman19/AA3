#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const refinementPath = 'src/workspace/lafea-retained-mesh-refinement.js';
const evidencePath = 'src/workspace/lafea-analysis-mesh-evidence-v2.js';
const originalRefinement = fs.readFileSync(refinementPath, 'utf8');
const originalEvidence = fs.readFileSync(evidencePath, 'utf8');
const roundsAnchor = 'const REFINEMENT_SMOOTHING_ROUNDS = 3;';
assert.ok(originalRefinement.includes(roundsAnchor), 'smoothing-round anchor missing');
const evidenceAnchor = "  if (result.qualification !== 'PASS') {\n    fail('LAFEA_ANALYSIS_MESH_V2_REFINEMENT_ADJACENT_SIZE_RATIO_BLOCK');\n  }";
assert.ok(originalEvidence.includes(evidenceAnchor), 'adjacency evidence anchor missing');
const instrumentedEvidence = originalEvidence.replace(
  evidenceAnchor,
  "  if (result.qualification !== 'PASS') {\n    console.error('PR1270_SMOOTHING_METRIC=' + JSON.stringify(result));\n    fail('LAFEA_ANALYSIS_MESH_V2_REFINEMENT_ADJACENT_SIZE_RATIO_BLOCK');\n  }",
);

const testedRounds = [3, 4, 5, 6, 8, 10, 12, 16, 20];
const rows = [];
try {
  fs.writeFileSync(evidencePath, instrumentedEvidence);
  for (const rounds of testedRounds) {
    fs.writeFileSync(refinementPath, originalRefinement.replace(
      roundsAnchor,
      `const REFINEMENT_SMOOTHING_ROUNDS = ${rounds};`,
    ));
    const run = spawnSync(process.execPath, ['scripts/lafea-retained-mesh-refinement-check.mjs'], {
      encoding: 'utf8',
    });
    const combined = `${run.stdout ?? ''}\n${run.stderr ?? ''}`;
    const match = combined.match(/PR1270_SMOOTHING_METRIC=(\{[^\n]+\})/u);
    const metric = match ? JSON.parse(match[1]) : null;
    rows.push({
      rounds,
      status: run.status === 0 ? 'PASS' : 'FAIL',
      maximumObserved: metric?.maximumObserved ?? null,
      violatingAdjacencyCount: metric?.violatingAdjacencyCount ?? (run.status === 0 ? 0 : null),
    });
  }
} finally {
  fs.writeFileSync(refinementPath, originalRefinement);
  fs.writeFileSync(evidencePath, originalEvidence);
}

console.log(JSON.stringify({
  check: 'PR1270_SMOOTHING_ROUND_SWEEP',
  acceptanceMaximum: 1.5,
  rows,
}));
assert.ok(rows.some((row) => row.status === 'PASS'), 'no tested deterministic smoothing round count satisfied the unchanged 1.5 gate');
