#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const gradingPath = 'src/workspace/lafea-retained-mesh-refinement-grading.js';
const evidencePath = 'src/workspace/lafea-analysis-mesh-evidence-v2.js';
const originalGrading = fs.readFileSync(gradingPath, 'utf8');
const originalEvidence = fs.readFileSync(evidencePath, 'utf8');

const functionStart = originalGrading.indexOf('export function buildLafea3RetainedRefinementGrading({');
const nextFunction = originalGrading.indexOf('\nfunction latticeCandidates(', functionStart);
assert.ok(functionStart >= 0 && nextFunction > functionStart, 'grading function anchors missing');
const diagnosticBuild = `export function buildLafea3RetainedRefinementGrading({
  targets,
  localTargetElementLength,
  globalTargetElementLength,
  influenceRadius,
  adjacentSizeRatioMax,
  minimumElementsPerTransitionBand = 2,
}) {
  const transition = refinementTransitionLadder(
    globalTargetElementLength,
    localTargetElementLength,
    adjacentSizeRatioMax,
  );
  const requiredInfluenceRadius = minimumLafea3RetainedRefinementInfluenceRadius({
    localTargetElementLength,
    globalTargetElementLength,
    adjacentSizeRatioMax,
    minimumElementsPerTransitionBand,
  });
  if (!(influenceRadius + DISTANCE_TOLERANCE >= requiredInfluenceRadius)) {
    fail('LAFEA3_RETAINED_REFINEMENT_INFLUENCE_RADIUS_TOO_SMALL_FOR_GRADED_TRANSITION');
  }

  // DIAGNOSTIC ONLY: remove every size-transition interface.  Four times the
  // declared radius covers the complete 200 x 120 sample, while the production
  // insertion path still rejects points outside the retained parent domain and
  // still preserves all constrained boundary nodes.
  const canonicalTargets = canonicalTargetPoints(targets);
  const coverageRadius = influenceRadius * 4;
  const bands = [{
    bandIndex: 0,
    targetElementLength: localTargetElementLength,
    innerRadius: 0,
    outerRadius: coverageRadius,
    elementsAcrossBand: null,
    role: 'DIAGNOSTIC_UNIFORM_FINE_DOMAIN',
  }];
  const candidatesByKey = new Map();
  for (const target of canonicalTargets) {
    for (const candidate of latticeCandidates(target, localTargetElementLength, coverageRadius)) {
      const key = \`${'${candidate.x},${candidate.y}'}\`;
      candidatesByKey.set(key, {
        ...candidate,
        bandIndex: 0,
        targetElementLength: localTargetElementLength,
      });
    }
  }
  return freeze({
    transition,
    requiredInfluenceRadius,
    localCoreRadius: localTargetElementLength,
    bands: bands.map(freeze),
    transitionOuterRadius: coverageRadius,
    unmodifiedParentAnnulusWidth: 0,
    candidates: [...candidatesByKey.values()].sort((a, b) => a.y - b.y || a.x - b.x),
  });
}
`;
const diagnosticGrading = originalGrading.slice(0, functionStart)
  + diagnosticBuild
  + originalGrading.slice(nextFunction);

const evidenceAnchor = `  const result = qualifyRefinedMeshAdjacentSizeRatio(
    mesh,
    meshProfile.fields.adjacentSizeRatioMax,
  );`;
assert.ok(originalEvidence.includes(evidenceAnchor), 'adjacency evidence anchor missing');
const diagnosticEvidence = originalEvidence.replace(
  evidenceAnchor,
  `${evidenceAnchor}\n  console.error('PR1270_UNIFORM_FINE_METRIC=' + JSON.stringify(result));`,
);

try {
  fs.writeFileSync(gradingPath, diagnosticGrading);
  fs.writeFileSync(evidencePath, diagnosticEvidence);
  for (const file of [gradingPath, evidencePath]) {
    const checked = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    process.stdout.write(checked.stdout ?? '');
    process.stderr.write(checked.stderr ?? '');
    assert.equal(checked.status, 0, `node --check failed for ${file}`);
  }
  const run = spawnSync(process.execPath, ['scripts/lafea-retained-mesh-refinement-check.mjs'], {
    encoding: 'utf8',
  });
  const combined = `${run.stdout ?? ''}\n${run.stderr ?? ''}`;
  process.stdout.write(run.stdout ?? '');
  process.stderr.write(run.stderr ?? '');
  const match = combined.match(/PR1270_UNIFORM_FINE_METRIC=(\{[^\n]+\})/u);
  assert.ok(match, 'uniform-fine diagnostic did not reach the actual adjacency gate');
  const metric = JSON.parse(match[1]);
  console.log(JSON.stringify({
    check: 'PR1270_UNIFORM_FINE_DOMAIN_FALSIFIER',
    localTargetElementLength: 15,
    acceptanceMaximum: 1.5,
    childExitCode: run.status,
    maximumObserved: metric.maximumObserved,
    adjacentEdgeCount: metric.adjacentEdgeCount,
    violatingAdjacencyCount: metric.violatingAdjacencyCount,
    qualification: metric.qualification,
  }));
  assert.equal(metric.qualification, 'PASS', 'uniform fine domain still violates actual adjacency policy');
} finally {
  fs.writeFileSync(gradingPath, originalGrading);
  fs.writeFileSync(evidencePath, originalEvidence);
}
