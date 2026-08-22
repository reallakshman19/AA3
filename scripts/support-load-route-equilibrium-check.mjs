#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  createEmptyProjectDataProfile,
  createEvidenceValue,
} from '../src/workspace/project-data/project-data-contract.js';
import { calculateSupportLoadDistribution } from '../src/workspace/engineering-loads/support-load-distribution-v3.js';

const profile = makeProfile();
const dataset = {
  datasetId: 'ISSUE1321-ROUTE-CLOSURE',
  version: 1,
  sourceSha256: '1'.repeat(64),
  entities: [pipeEntity('P-1', 'L-1'), pipeEntity('P-2', 'L-2')],
};
const supportSiteModel = {
  schema: 'support-site-model/v1',
  status: 'READY',
  sites: [
    support('S-1A', 0, 0), support('S-1B', 1000, 0),
    support('S-2A', 0, 10000), support('S-2B', 1000, 10000),
  ],
};
const routePartitionModel = {
  schema: 'route-partition-model/v1',
  status: 'READY',
  routes: [
    route('R-PLUS', 'P-1', 600),
    route('R-MINUS', 'P-2', 400),
  ],
  edges: [
    pipeEdge('P-1', 0),
    pipeEdge('P-2', 10000),
  ],
};
const masterData = {
  lineList: { sourceHash: '2'.repeat(64) },
  pipingClass: { sourceHash: '3'.repeat(64) },
  weight: { sourceHash: '4'.repeat(64) },
};

const result = calculateSupportLoadDistribution({
  dataset,
  profile,
  supportSiteModel,
  routePartitionModel,
  masterData,
});
const loadCase = result.loadCases[0];

assert.equal(result.status, 'FAILED');
assert.equal(loadCase.status, 'FAILED');
assert.equal(loadCase.equilibrium.status, 'FAILED');
assert.equal(loadCase.equilibrium.momentResidualNmm, 0,
  'aggregate residual is deliberately zero and must not be treated as sufficient');
assert.equal(loadCase.equilibrium.routeChecks.length, 2);
const plus = loadCase.equilibrium.routeChecks.find((row) => row.routeId === 'R-PLUS');
const minus = loadCase.equilibrium.routeChecks.find((row) => row.routeId === 'R-MINUS');
assert.ok(plus && minus);
assert.equal(plus.passed, false);
assert.equal(minus.passed, false);
assert.ok(plus.momentResidualNmm < 0);
assert.ok(minus.momentResidualNmm > 0);
assert.equal(plus.momentResidualNmm + minus.momentResidualNmm, 0);
assert.equal(loadCase.blockers.filter((row) => row.code === 'ROUTE_EQUILIBRIUM_CHECK_FAILED').length, 2);
assert.equal(loadCase.supportResults.every((row) => row.verticalForceN === null), true,
  'route-local equilibrium failure must suppress production reactions');

console.log(JSON.stringify({
  status: 'PASS',
  benchmark: 'ISSUE1321_ROUTE_LOCAL_ANTI_CANCELLATION',
  aggregateMomentResidualNmm: loadCase.equilibrium.momentResidualNmm,
  routeResiduals: loadCase.equilibrium.routeChecks.map((row) => ({
    routeId: row.routeId,
    momentResidualNmm: row.momentResidualNmm,
    passed: row.passed,
  })),
}, null, 2));

function makeProfile() {
  const empty = createEmptyProjectDataProfile();
  const source = (value, sourceKey, sourceHash) => createEvidenceValue(
    value,
    { source: 'ISSUE1321_ROUTE_FIXTURE', sourceKey, sourceHash },
    true,
  );
  const approved = (value, sourceName) => createEvidenceValue(value, { source: sourceName }, true);
  return {
    ...empty,
    projectId: 'ISSUE1321-ROUTE-PROJECT',
    revision: 1,
    updatedAt: '2026-08-22T08:55:00.000Z',
    sourcesAndUnits: {
      ...empty.sourcesAndUnits,
      lineListSource: source({ sha256: '2'.repeat(64) }, 'lineList', '2'.repeat(64)),
      pipingClassSource: source({ sha256: '3'.repeat(64) }, 'pipingClass', '3'.repeat(64)),
      componentWeightSource: source({ sha256: '4'.repeat(64) }, 'componentWeight', '4'.repeat(64)),
    },
    topology: {
      ...empty.topology,
      portMatchToleranceMm: approved(1, 'ISSUE1321_TOPOLOGY'),
      supportSiteGroupingToleranceMm: approved(1, 'ISSUE1321_TOPOLOGY'),
      autoCarrierCoincidenceToleranceMm: approved(1, 'ISSUE1321_TOPOLOGY'),
      routeJoiningRules: approved({ mode: 'EXACT' }, 'ISSUE1321_TOPOLOGY'),
      supportTypeCapabilities: approved({ REST: { vertical: true } }, 'ISSUE1321_TOPOLOGY'),
    },
    loadCalculation: {
      ...empty.loadCalculation,
      gravityMPerS2: approved(1, 'ISSUE1321_LOAD_BASIS'),
      loadFactor: approved(1, 'ISSUE1321_LOAD_BASIS'),
      materialDensitiesKgPerM3: approved({ MAT: 1000 }, 'ISSUE1321_MATERIAL'),
      pipeSectionProperties: approved({
        'L-1': section(),
        'L-2': section(),
      }, 'ISSUE1321_SECTION'),
      operatingFluidDensitiesKgPerM3: approved({ DEFAULT: 800 }, 'ISSUE1321_FLUID'),
      hydroFluidDensitiesKgPerM3: approved({ DEFAULT: 1000 }, 'ISSUE1321_FLUID'),
      insulationDensitiesKgPerM3: approved({ NONE: 0 }, 'ISSUE1321_INSULATION'),
      componentWeightsKg: approved({ DUMMY: 1 }, 'ISSUE1321_COMPONENT'),
      equilibriumTolerances: approved({ forceN: 1e-9, momentNmm: 1e-6 }, 'ISSUE1321_EQUILIBRIUM'),
      activeLoadCases: approved(['EMPTY'], 'ISSUE1321_LOAD_BASIS'),
    },
  };
}

function section() {
  return {
    outsideDiameterMm: 100,
    wallThicknessMm: 5,
    materialCode: 'MAT',
    insulationCode: 'NONE',
    insulationThicknessMm: 0,
  };
}

function pipeEntity(entityId, lineKey) {
  return {
    entityId,
    entityType: 'PIPE',
    lineKey,
    sourceEntityId: `SRC-${entityId}`,
    jsonPointer: `/pipes/${entityId}`,
    componentReference: entityId,
    properties: {},
  };
}

function support(siteId, x, y) {
  return {
    siteId,
    tags: [siteId],
    positionMm: { x, y, z: 0 },
    assemblyIds: [`A-${siteId}`],
    memberEntityIds: [`M-${siteId}`],
    assemblies: [{ members: [{ sourceType: 'REST' }] }],
  };
}

function route(routeId, entityId, pointMm) {
  return {
    routeId,
    status: 'READY',
    blockers: [],
    physicalEdgeIds: [entityId],
    entityChainages: [{
      entityId,
      startMm: 0,
      endMm: 1000,
      pointMm,
      sourceStartChainageMm: 0,
      sourceEndChainageMm: 1000,
    }],
  };
}

function pipeEdge(entityId, y) {
  return {
    entityId,
    entityType: 'PIPE',
    lengthMm: 1000,
    pointComponent: false,
    topologyCarrier: false,
    startMm: { x: 0, y, z: 0 },
    endMm: { x: 1000, y, z: 0 },
  };
}
