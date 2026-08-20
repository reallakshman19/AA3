#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const refinementPath = 'src/workspace/lafea-retained-mesh-refinement.js';
const evidencePath = 'src/workspace/lafea-analysis-mesh-evidence-v2.js';
const originalRefinement = fs.readFileSync(refinementPath, 'utf8');
const originalEvidence = fs.readFileSync(evidencePath, 'utf8');

const boundaryAnchor = '  boundaryClearanceLocalFactor: 0.30,';
const pointAnchor = '  pointClearanceLocalFactor: 0.18,';
assert.ok(originalRefinement.includes(boundaryAnchor), 'boundary-clearance anchor missing');
assert.ok(originalRefinement.includes(pointAnchor), 'point-clearance anchor missing');
const evidenceAnchor = `  const result = qualifyRefinedMeshAdjacentSizeRatio(
    mesh,
    meshProfile.fields.adjacentSizeRatioMax,
  );`;
assert.ok(originalEvidence.includes(evidenceAnchor), 'adjacency evidence anchor missing');
const diagnosticEvidence = originalEvidence.replace(
  evidenceAnchor,
  `${evidenceAnchor}\n  console.error('PR1270_CLEARANCE_METRIC=' + JSON.stringify({ maximumObserved: result.maximumObserved, adjacentEdgeCount: result.adjacentEdgeCount, violatingAdjacencyCount: result.violatingAdjacencyCount, qualification: result.qualification }));`,
);

const cases = [
  [0.30, 0.18], [0.50, 0.18], [0.75, 0.18], [1.00, 0.18], [1.25, 0.18], [1.50, 0.18],
  [0.75, 0.35], [0.75, 0.50], [0.75, 0.65], [0.75, 0.80], [0.75, 1.00],
  [1.00, 0.35], [1.00, 0.50], [1.00, 0.65], [1.00, 0.80], [1.00, 1.00],
  [1.25, 0.35], [1.25, 0.50], [1.25, 0.65], [1.25, 0.80], [1.25, 1.00],
  [1.50, 0.35], [1.50, 0.50], [1.50, 0.65], [1.50, 0.80], [1.50, 1.00],
];
const rows = [];
try {
  fs.writeFileSync(evidencePath, diagnosticEvidence);
  for (const [boundaryClearanceLocalFactor, pointClearanceLocalFactor] of cases) {
    const candidateSource = originalRefinement
      .replace(boundaryAnchor, `  boundaryClearanceLocalFactor: ${boundaryClearanceLocalFactor},`)
      .replace(pointAnchor, `  pointClearanceLocalFactor: ${pointClearanceLocalFactor},`);
    fs.writeFileSync(refinementPath, candidateSource);
    const run = spawnSync(process.execPath, ['scripts/lafea-retained-mesh-refinement-check.mjs'], {
      encoding: 'utf8',
    });
    const combined = `${run.stdout ?? ''}\n${run.stderr ?? ''}`;
    const match = combined.match(/PR1270_CLEARANCE_METRIC=(\{[^\n]+\})/u);
    const metric = match ? JSON.parse(match[1]) : null;
    const firstError = combined.match(/(?:TypeError|Error): ([A-Z0-9_]+)/u)?.[1] ?? null;
    rows.push({
      boundaryClearanceLocalFactor,
      pointClearanceLocalFactor,
      childExitCode: run.status,
      maximumObserved: metric?.maximumObserved ?? null,
      adjacentEdgeCount: metric?.adjacentEdgeCount ?? null,
      violatingAdjacencyCount: metric?.violatingAdjacencyCount ?? null,
      qualification: metric?.qualification ?? 'NOT_REACHED',
      firstError,
    });
  }
} finally {
  fs.writeFileSync(refinementPath, originalRefinement);
  fs.writeFileSync(evidencePath, originalEvidence);
}

const passing = rows.filter((row) => row.qualification === 'PASS');
console.log(JSON.stringify({
  check: 'PR1270_CLEARANCE_SWEEP',
  acceptanceMaximum: 1.5,
  baseline: { boundaryClearanceLocalFactor: 0.30, pointClearanceLocalFactor: 0.18 },
  rows,
  passing,
}));
assert.ok(passing.length > 0, 'clearance sweep found no candidate satisfying the unchanged actual-topology gate');
