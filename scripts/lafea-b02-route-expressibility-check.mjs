#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createLafeaMeshGenerationIntentV2 } from '../src/workspace/lafea-domain-first-requests.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'validation/lafea-b02-definitions');
const manifest = read('frozen-definition-manifest.json');
const definitions = Object.fromEntries(Object.entries(manifest.definitionFiles).map(([id, relative]) => [
  id,
  JSON.parse(fs.readFileSync(path.join(ROOT, relative), 'utf8')),
]));

assert.equal(manifest.schema, 'lafea-b02-frozen-definition-manifest/v2');
assert.equal(manifest.stageId, 'LAFEA.3');
assert.equal(manifest.originalFreeze.frozenBeforeAnyB02ProductionObservation, true);
assert.equal(manifest.originalFreeze.productionOutputUsedToGenerateTargetsTolerancesProbesOrMeshes, false);

const routeEvidence = [];
for (const id of ['B02A', 'B02B', 'B02C']) {
  routeEvidence.push(...validateRegisteredLadder(id, definitions[id].meshLadder, definitions[id].meshLadder.methods));
}
routeEvidence.push(...validateRegisteredLadder(
  'B02D',
  definitions.B02D.globalResponseLadder,
  definitions.B02D.globalResponseLadder.methods,
));

console.log(JSON.stringify({
  schema: 'lafea-b02-route-expressibility-check/v1',
  status: 'PASS',
  authorityBoundary: 'CURRENT_PRODUCTION_MESH_INTENT_ROUTE_EXPRESSIBILITY',
  frozenDefinitionHead: manifest.originalFreeze.definitionFreezeExactHead,
  frozenDefinitionsRemainPreObservation: true,
  routeProducer: 'createLafeaMeshGenerationIntentV2',
  routeEvidence,
  registeredMeshIntentContractSatisfied: true,
  frozenDefinitionCustodyGrantedByThisCheck: false,
  benchmarkAuthorityChanged: false,
  releaseAuthorityGranted: false,
  temperatureAuthorityGranted: false,
}, null, 2));

function validateRegisteredLadder(caseId, ladder, methods) {
  assert.equal(ladder.requestSchema, 'REGISTERED_LAFEA_MESH_GENERATION_INTENT_V2');
  assertRatio2(ladder.levels);
  const evidence = [];
  for (const level of ladder.levels) {
    assert.equal(level.h, level.targetElementLength);
    for (const [elementFamily, applicability] of Object.entries(methods)) {
      if (applicability === 'NOT_APPLICABLE') continue;
      const policy = ladder.familyRequestPolicy[elementFamily];
      const common = ladder.commonRequestPolicy;
      assert.ok(policy, `${caseId}/${elementFamily} family request policy missing`);
      const intent = createLafeaMeshGenerationIntentV2({
        schema: 'lafea-mesh-generation-intent/v2',
        stageId: 'LAFEA.3',
        sourceHash: `sha256:${'1'.repeat(64)}`,
        analysisDomainHash: `sha256:${'2'.repeat(64)}`,
        analysisGeometryHash: `sha256:${'3'.repeat(64)}`,
        meshProfileHash: 'route-expressibility-profile',
        targetElementLength: level.targetElementLength,
        lengthUnit: common.lengthUnit,
        elementFamily,
        curvatureToleranceDegrees: level.curvatureToleranceDegrees,
        growthLimit: common.growthLimit,
        maximumNodes: common.maximumNodes,
        maximumElements: common.maximumElements,
        maximumEstimatedDofs: common.maximumEstimatedDofs,
        refinementFeatureIds: common.refinementFeatureIds,
        allowT3Fallback: policy.allowT3Fallback,
        stageAdapterId: 'LAFEA.3:ROUTE_EXPRESSIBILITY_CHECK',
        stageAdapterRevision: 'ROUTE_EXPRESSIBILITY_CHECK',
      });
      assert.equal(intent.status, 'EXECUTABLE_INTENT', `${caseId}/${level.levelId}/${elementFamily} route status`);
      assert.equal(intent.executionAuthorized, true,
        `${caseId}/${level.levelId}/${elementFamily} route authorization`);
      assert.ok(intent.producerRef, `${caseId}/${level.levelId}/${elementFamily} producerRef missing`);
      evidence.push(Object.freeze({
        caseId,
        levelId: level.levelId,
        elementFamily,
        targetElementLength: level.targetElementLength,
        status: intent.status,
        executionAuthorized: intent.executionAuthorized,
        producerRef: intent.producerRef,
      }));
    }
  }
  return evidence;
}

function assertRatio2(levels) {
  assert.ok(levels.length >= 3);
  for (let i = 1; i < levels.length; i += 1) {
    assert.ok(Math.abs(levels[i - 1].h / levels[i].h - 2) < 1e-12,
      `${levels[i - 1].levelId}->${levels[i].levelId} frozen h ratio must equal 2`);
  }
}

function read(name) {
  return JSON.parse(fs.readFileSync(path.join(DIR, name), 'utf8'));
}
