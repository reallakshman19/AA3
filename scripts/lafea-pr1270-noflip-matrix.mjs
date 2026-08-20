#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const refinerPath = 'src/workspace/lafea-retained-mesh-refinement.js';
const original = fs.readFileSync(refinerPath, 'utf8');
const callAnchor = "  const coreElements = plan.elementFamily === 'T6'\n";
assert.ok(original.includes(callAnchor), 'no-flip call anchor missing');

const call = `  const closure = closeNoFlipAdjacency({\n    points, triangles: restored, constrainedEdgeKeys: constraints,\n    boundaryMidpoints: triangulation.boundaryMidpoints, family: plan.elementFamily,\n    maximumAdjacentRatio: adjacentSizeRatioMax,\n  });\n  restored = closure.triangles;\n  localPointCount += closure.insertionCount;\n\n`;

const helper = String.raw`
function closeNoFlipAdjacency({
  points, triangles, constrainedEdgeKeys, boundaryMidpoints, family,
  maximumAdjacentRatio, maximumInsertions = Math.max(128, triangles.length * 8),
}) {
  let working = triangles.map((triangle) => [...triangle]);
  const initial = measureNoFlipAdjacency(points, working, maximumAdjacentRatio);
  let insertionCount = 0;
  let boundarySplitCount = 0;
  while (insertionCount < maximumInsertions) {
    const measured = measureNoFlipAdjacency(points, working, maximumAdjacentRatio);
    if (measured.qualification === 'PASS') {
      console.error('PR1270_NOFLIP_CLOSURE=' + JSON.stringify({
        qualification: 'PASS', insertionCount, boundarySplitCount,
        initialMaximumObserved: initial.maximumObserved,
        finalMaximumObserved: measured.maximumObserved,
        violatingAdjacencyCount: 0,
      }));
      return { triangles: working, insertionCount, boundarySplitCount };
    }
    let changed = false;
    for (const violation of measured.violations) {
      const coarse = working[violation.coarseTriangleIndex];
      if (!coarse) continue;
      for (const edge of noFlipTriangleEdges(points, coarse)) {
        const midpoint = {
          x: (points[edge.a].x + points[edge.b].x) / 2,
          y: (points[edge.a].y + points[edge.b].y) / 2,
        };
        if (constrainedEdgeKeys.has(edge.key)) {
          if (!splitStraightBoundaryEdgeNoFlip({
            points, triangles: working, constrainedEdgeKeys, boundaryMidpoints,
            family, a: edge.a, b: edge.b, key: edge.key, midpoint,
          })) continue;
          insertionCount += 1;
          boundarySplitCount += 1;
          changed = true;
          break;
        }
        if (insertInteriorPoint(points, working, constrainedEdgeKeys, midpoint)) {
          insertionCount += 1;
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
    if (!changed) {
      console.error('PR1270_NOFLIP_CLOSURE=' + JSON.stringify({
        qualification: 'STALLED', insertionCount, boundarySplitCount,
        initialMaximumObserved: initial.maximumObserved,
        finalMaximumObserved: measured.maximumObserved,
        violatingAdjacencyCount: measured.violatingAdjacencyCount,
      }));
      fail('LAFEA3_RETAINED_REFINEMENT_NOFLIP_CLOSURE_STALLED');
    }
  }
  const final = measureNoFlipAdjacency(points, working, maximumAdjacentRatio);
  console.error('PR1270_NOFLIP_CLOSURE=' + JSON.stringify({
    qualification: 'LIMIT', insertionCount, boundarySplitCount,
    initialMaximumObserved: initial.maximumObserved,
    finalMaximumObserved: final.maximumObserved,
    violatingAdjacencyCount: final.violatingAdjacencyCount,
  }));
  fail('LAFEA3_RETAINED_REFINEMENT_NOFLIP_CLOSURE_LIMIT');
}

function measureNoFlipAdjacency(points, triangles, maximumAdjacentRatio) {
  const h = triangles.map((triangle) => noFlipTriangleEdges(points, triangle)[0].length);
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
  const violations = [];
  for (const [sharedEdgeKey, rows] of owners) {
    if (rows.length !== 2) continue;
    const [left, right] = rows;
    const lo = Math.min(h[left], h[right]);
    const hi = Math.max(h[left], h[right]);
    const ratio = hi / lo;
    maximumObserved = Math.max(maximumObserved, ratio);
    if (ratio <= maximumAdjacentRatio + 1e-12) continue;
    violations.push({
      sharedEdgeKey, ratio,
      coarseTriangleIndex: h[left] > h[right] ? left : h[right] > h[left] ? right : Math.min(left, right),
    });
  }
  violations.sort((a, b) => b.ratio - a.ratio
    || a.sharedEdgeKey.localeCompare(b.sharedEdgeKey)
    || a.coarseTriangleIndex - b.coarseTriangleIndex);
  return {
    maximumObserved, violatingAdjacencyCount: violations.length, violations,
    qualification: violations.length ? 'BLOCK' : 'PASS',
  };
}

function noFlipTriangleEdges(points, triangle) {
  return [0, 1, 2].map((edge) => {
    const a = triangle[edge]; const b = triangle[(edge + 1) % 3];
    return { a, b, key: edgeKey(a, b), length: Math.hypot(
      points[b].x - points[a].x, points[b].y - points[a].y,
    ) };
  }).sort((a, b) => b.length - a.length || a.key.localeCompare(b.key));
}

function splitStraightBoundaryEdgeNoFlip({
  points, triangles, constrainedEdgeKeys, boundaryMidpoints, family, a, b, key, midpoint,
}) {
  const owners = [];
  for (let triangleIndex = 0; triangleIndex < triangles.length; triangleIndex += 1) {
    const triangle = triangles[triangleIndex];
    for (let edgeIndex = 0; edgeIndex < 3; edgeIndex += 1) {
      if (edgeKey(triangle[edgeIndex], triangle[(edgeIndex + 1) % 3]) === key) {
        owners.push({ triangleIndex, edgeIndex });
      }
    }
  }
  if (owners.length !== 1) return false;
  if (family === 'T6') {
    const ownedMid = boundaryMidpoints.get(key)?.midPoint?.point;
    if (!ownedMid || Math.hypot(ownedMid.x - midpoint.x, ownedMid.y - midpoint.y) > 1e-10) {
      return false;
    }
  }
  if (points.some((point) => Math.hypot(point.x - midpoint.x, point.y - midpoint.y) <= 1e-12)) {
    return false;
  }
  const inserted = points.length;
  points.push(midpoint);
  const owner = owners[0];
  const triangle = triangles[owner.triangleIndex];
  const u = triangle[owner.edgeIndex];
  const v = triangle[(owner.edgeIndex + 1) % 3];
  const apex = triangle[(owner.edgeIndex + 2) % 3];
  triangles.splice(owner.triangleIndex, 1,
    [u, inserted, apex], [inserted, v, apex]);
  normalizeTriangle(triangles[owner.triangleIndex], points);
  normalizeTriangle(triangles[owner.triangleIndex + 1], points);
  constrainedEdgeKeys.delete(key);
  const leftKey = edgeKey(u, inserted);
  const rightKey = edgeKey(inserted, v);
  constrainedEdgeKeys.add(leftKey);
  constrainedEdgeKeys.add(rightKey);
  if (family === 'T6') {
    boundaryMidpoints.delete(key);
    boundaryMidpoints.set(leftKey, {
      curveId: null,
      midPoint: { point: {
        x: (points[u].x + midpoint.x) / 2,
        y: (points[u].y + midpoint.y) / 2,
      } },
    });
    boundaryMidpoints.set(rightKey, {
      curveId: null,
      midPoint: { point: {
        x: (midpoint.x + points[v].x) / 2,
        y: (midpoint.y + points[v].y) / 2,
      } },
    });
  }
  return true;
}
`;

const patched = original.replace(callAnchor, call + callAnchor) + helper;
const families = ['T3', 'T6'];
const localTargets = [22.5, 15, 11.25, 7.5];
const scenarios = [
  { name: 'CENTER', width: 200, height: 120, xf: 0.5, yf: 0.5 },
  { name: 'NEAR_EDGE', width: 200, height: 120, xf: 0.15, yf: 0.5 },
  { name: 'NEAR_CORNER', width: 200, height: 120, xf: 0.15, yf: 0.15 },
  { name: 'ELONGATED', width: 300, height: 90, xf: 0.5, yf: 0.5 },
];
const rows = [];
try {
  fs.writeFileSync(refinerPath, patched);
  for (const family of families) {
    for (const localTarget of localTargets) {
      for (const scenario of scenarios) {
        rows.push(runCase(family, localTarget, scenario));
      }
    }
  }
} finally {
  fs.writeFileSync(refinerPath, original);
}
const failures = rows.filter((row) => row.exitCode !== 0 || row.qualification !== 'PASS');
const passes = rows.filter((row) => row.exitCode === 0 && row.qualification === 'PASS');
console.log(`PR1270_NOFLIP_MATRIX=${JSON.stringify({
  caseCount: rows.length, passCount: passes.length, failCount: failures.length,
  worstPassingMaximumObserved: passes.length ? Math.max(...passes.map((row) => row.maximumObserved)) : null,
  failureCaseIds: failures.map((row) => row.caseId), rows,
})}`);
assert.equal(failures.length, 0, `no-flip candidate failed ${failures.length}/${rows.length} cases`);

function runCase(family, localTarget, scenario) {
  const caseId = `NOFLIP_${family}_H${String(localTarget).replace('.', '_')}_${scenario.name}`;
  const run = spawnSync(process.execPath, ['scripts/lafea-pr1270-noflip-case.mjs'], {
    encoding: 'utf8',
    env: {
      ...process.env, PR1270_CASE_ID: caseId, PR1270_FAMILY: family,
      PR1270_HGLOBAL: '30', PR1270_HLOCAL: String(localTarget),
      PR1270_WIDTH: String(scenario.width), PR1270_HEIGHT: String(scenario.height),
      PR1270_XF: String(scenario.xf), PR1270_YF: String(scenario.yf),
    },
  });
  const text = `${run.stdout ?? ''}\n${run.stderr ?? ''}`;
  const result = text.match(/PR1270_NOFLIP_CASE=(\{[^\n]+\})/u);
  const closureRows = [...text.matchAll(/PR1270_NOFLIP_CLOSURE=(\{[^\n]+\})/gu)];
  const closure = closureRows.length ? JSON.parse(closureRows.at(-1)[1]) : null;
  const parsed = result ? JSON.parse(result[1]) : null;
  const error = text.match(/(?:TypeError|Error|AssertionError)[^:]*:\s*([A-Z0-9_]+)/u)?.[1] ?? null;
  return {
    caseId, family, localTarget, ratio: localTarget / 30, scenario: scenario.name,
    exitCode: run.status, qualification: parsed?.qualification ?? closure?.qualification ?? 'NOT_REACHED',
    maximumObserved: parsed?.maximumObserved ?? closure?.finalMaximumObserved ?? null,
    insertionCount: closure?.insertionCount ?? null,
    boundarySplitCount: closure?.boundarySplitCount ?? null,
    localPointCount: parsed?.localPointCount ?? null,
    localCornerGain: parsed?.localCornerGain ?? null,
    error,
  };
}
