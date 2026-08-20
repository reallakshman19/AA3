#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const gradingPath = 'src/workspace/lafea-retained-mesh-refinement-grading.js';
const refinementPath = 'src/workspace/lafea-retained-mesh-refinement.js';

let grading = fs.readFileSync(gradingPath, 'utf8');
const importAnchor = "import { refinementTransitionLadder } from '../core/lafea-meshing/refinement-fields.js';\n";
assert.ok(grading.includes(importAnchor), 'grading import anchor missing');
grading = grading.replace(
  importAnchor,
  `${importAnchor}import { insertInteriorPoint } from '../core/lafea-meshing/interior-refinement-t6.js';\nimport { edgeKey, lawsonFlip } from '../core/lafea-meshing/constrained-delaunay-t6.js';\n`,
);
const helperAnchor = 'function latticeCandidates(target, spacing, radius) {';
assert.ok(grading.includes(helperAnchor), 'grading helper anchor missing');
const helper = String.raw`
export function closeLafea3RetainedRefinementAdjacency({
  points,
  triangles,
  constrainedEdgeKeys,
  maximumAdjacentRatio,
  maximumInsertions = Math.max(64, triangles.length * 4),
}) {
  if (!(maximumAdjacentRatio > 1)) fail('LAFEA3_RETAINED_REFINEMENT_ADJACENCY_LIMIT_INVALID');
  let working = triangles.map((triangle) => [...triangle]);
  const initial = measureLafea3TriangulationAdjacency(points, working, maximumAdjacentRatio);
  let insertionCount = 0;
  while (insertionCount < maximumInsertions) {
    const measured = measureLafea3TriangulationAdjacency(points, working, maximumAdjacentRatio);
    if (measured.qualification === 'PASS') {
      console.log(JSON.stringify({
        check: 'PR1270_LONGEST_EDGE_CLOSURE',
        status: 'PASS',
        insertionCount,
        initialMaximumObserved: initial.maximumObserved,
        finalMaximumObserved: measured.maximumObserved,
        adjacentEdgeCount: measured.adjacentEdgeCount,
        violatingAdjacencyCount: measured.violatingAdjacencyCount,
      }));
      return { triangles: working, insertionCount, ...measured };
    }
    let inserted = false;
    for (const violation of measured.violations) {
      const triangle = working[violation.coarseTriangleIndex];
      if (!triangle) continue;
      for (const candidate of triangleEdgesByLength(points, triangle)) {
        if (constrainedEdgeKeys.has(candidate.key)) continue;
        const midpoint = {
          x: (points[candidate.a].x + points[candidate.b].x) / 2,
          y: (points[candidate.a].y + points[candidate.b].y) / 2,
        };
        if (exactPointExists(points, midpoint)) continue;
        if (!insertInteriorPoint(points, working, constrainedEdgeKeys, midpoint)) continue;
        insertionCount += 1;
        working = lawsonFlip(points, working, constrainedEdgeKeys);
        inserted = true;
        break;
      }
      if (inserted) break;
    }
    if (!inserted) {
      const error = new TypeError('LAFEA3_RETAINED_REFINEMENT_ADJACENCY_CLOSURE_STALLED');
      error.code = 'LAFEA3_RETAINED_REFINEMENT_ADJACENCY_CLOSURE_STALLED';
      error.diagnostics = measured;
      throw error;
    }
  }
  const final = measureLafea3TriangulationAdjacency(points, working, maximumAdjacentRatio);
  const error = new TypeError('LAFEA3_RETAINED_REFINEMENT_ADJACENCY_CLOSURE_LIMIT_EXCEEDED');
  error.code = 'LAFEA3_RETAINED_REFINEMENT_ADJACENCY_CLOSURE_LIMIT_EXCEEDED';
  error.diagnostics = {
    maximumInsertions,
    insertionCount,
    initialMaximumObserved: initial.maximumObserved,
    finalMaximumObserved: final.maximumObserved,
    finalViolatingAdjacencyCount: final.violatingAdjacencyCount,
  };
  throw error;
}

export function measureLafea3TriangulationAdjacency(points, triangles, maximumAdjacentRatio) {
  const characteristicLengths = triangles.map((triangle) => triangleCharacteristicLength(triangle, points));
  const owners = new Map();
  triangles.forEach((triangle, triangleIndex) => {
    for (let edge = 0; edge < 3; edge += 1) {
      const key = edgeKey(triangle[edge], triangle[(edge + 1) % 3]);
      const rows = owners.get(key) ?? [];
      rows.push(triangleIndex);
      owners.set(key, rows);
    }
  });
  let maximumObserved = 1;
  let adjacentEdgeCount = 0;
  const violations = [];
  for (const [sharedEdgeKey, edgeOwners] of owners) {
    if (edgeOwners.length !== 2) continue;
    adjacentEdgeCount += 1;
    const [left, right] = edgeOwners;
    const leftLength = characteristicLengths[left];
    const rightLength = characteristicLengths[right];
    const minimum = Math.min(leftLength, rightLength);
    const maximum = Math.max(leftLength, rightLength);
    const ratio = maximum / minimum;
    maximumObserved = Math.max(maximumObserved, ratio);
    if (ratio <= maximumAdjacentRatio + 1e-12) continue;
    const coarseTriangleIndex = leftLength > rightLength
      ? left
      : rightLength > leftLength
        ? right
        : Math.min(left, right);
    violations.push({
      sharedEdgeKey,
      ownerTriangleIndices: [left, right],
      coarseTriangleIndex,
      minimumCharacteristicLength: minimum,
      maximumCharacteristicLength: maximum,
      ratio,
    });
  }
  violations.sort((a, b) => b.ratio - a.ratio
    || a.sharedEdgeKey.localeCompare(b.sharedEdgeKey)
    || a.coarseTriangleIndex - b.coarseTriangleIndex);
  return {
    maximumAllowed: maximumAdjacentRatio,
    maximumObserved,
    adjacentEdgeCount,
    violatingAdjacencyCount: violations.length,
    violations,
    qualification: violations.length ? 'BLOCK' : 'PASS',
  };
}

function triangleEdgesByLength(points, triangle) {
  const rows = [];
  for (let edge = 0; edge < 3; edge += 1) {
    const a = triangle[edge];
    const b = triangle[(edge + 1) % 3];
    rows.push({
      a,
      b,
      key: edgeKey(a, b),
      length: Math.hypot(points[b].x - points[a].x, points[b].y - points[a].y),
    });
  }
  return rows.sort((a, b) => b.length - a.length || a.key.localeCompare(b.key));
}
function triangleCharacteristicLength(triangle, points) {
  return triangleEdgesByLength(points, triangle)[0].length;
}
function exactPointExists(points, point) {
  return points.some((candidate) => Math.abs(candidate.x - point.x) <= 1e-12
    && Math.abs(candidate.y - point.y) <= 1e-12);
}

`;
grading = grading.replace(helperAnchor, `${helper}${helperAnchor}`);
fs.writeFileSync(gradingPath, grading);

let refinement = fs.readFileSync(refinementPath, 'utf8');
const oldImport = "  buildLafea3RetainedRefinementGrading,\n  minimumLafea3RetainedRefinementInfluenceRadius,\n";
assert.ok(refinement.includes(oldImport), 'refinement import anchor missing');
refinement = refinement.replace(
  oldImport,
  "  buildLafea3RetainedRefinementGrading,\n  closeLafea3RetainedRefinementAdjacency,\n  minimumLafea3RetainedRefinementInfluenceRadius,\n",
);
const closureAnchor = "  const coreElements = plan.elementFamily === 'T6'\n";
assert.ok(refinement.includes(closureAnchor), 'closure call anchor missing');
refinement = refinement.replace(
  closureAnchor,
  "  const closure = closeLafea3RetainedRefinementAdjacency({\n    points,\n    triangles: restored,\n    constrainedEdgeKeys: constraints,\n    maximumAdjacentRatio: adjacentSizeRatioMax,\n  });\n  restored = closure.triangles;\n  localPointCount += closure.insertionCount;\n\n  const coreElements = plan.elementFamily === 'T6'\n",
);
fs.writeFileSync(refinementPath, refinement);

for (const file of [gradingPath, refinementPath]) {
  const checked = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  process.stdout.write(checked.stdout ?? '');
  process.stderr.write(checked.stderr ?? '');
  assert.equal(checked.status, 0, `node --check failed for ${file}`);
}

const run = spawnSync(process.execPath, ['scripts/lafea-retained-mesh-refinement-check.mjs'], {
  encoding: 'utf8',
});
process.stdout.write(run.stdout ?? '');
process.stderr.write(run.stderr ?? '');
assert.equal(run.status, 0, 'retained-mesh refinement regression failed under longest-edge candidate');
