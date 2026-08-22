#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  createEmptyProjectDataProfile,
  createEvidenceValue,
} from '../src/workspace/project-data/project-data-contract.js';
import {
  calculateSupportLoadDistribution,
} from '../src/workspace/engineering-loads/support-load-distribution-v3.js';

const hashes = {
  dataset: '1'.repeat(64),
  lineList: '2'.repeat(64),
  pipingClass: '3'.repeat(64),
  componentWeight: '4'.repeat(64),
};
const profile = makeProfile();
const dataset = makeDataset();
const supportSiteModel = makeSupportSites();
const routePartitionModel = makeRoutes();
const masterData = {
  lineList: { sourceHash: hashes.lineList },
  pipingClass: { sourceHash: hashes.pipingClass },
  weight: { sourceHash: hashes.componentWeight },
};

const result = calculateSupportLoadDistribution({
  dataset,
  profile,
  supportSiteModel,
  routePartitionModel,
  masterData,
});
const loadCase = result.loadCases[0];

assert.equal(result.status, 'CALCULATED_WITH_EXCEPTIONS');
assert.equal(loadCase.status, 'CALCULATED_WITH_EXCEPTIONS');
assert.equal(loadCase.equilibrium.status, 'PASSED');
assert.equal(loadCase.equilibrium.forceResidualN, 0);
assert.equal(loadCase.equilibrium.momentResidualNmm, 0);
assert.equal(loadCase.completenessAudit.evaluatedForceN, 18000);
assert.equal(loadCase.completenessAudit.allocatedForceN, 15000);
assert.equal(loadCase.completenessAudit.unallocatedForceN, 3000);
assert.equal(loadCase.completenessAudit.coverageRatio, 15000 / 18000);
assert.equal(loadCase.completenessAudit.boundaryTransferMomentNmm, 6000000);
assert.equal(loadCase.completenessAudit.unallocatedFirstMomentNmm, 15000000);

const reactions = Object.fromEntries(loadCase.supportResults.map((row) => [row.supportSiteId, row]));
assert.equal(reactions['S-A'].verticalForceN, 7200);
assert.equal(reactions['S-B'].verticalForceN, 4800);
assert.equal(reactions['S-C'].verticalForceN, 3000);
assert.equal(reactions['S-C'].cantileverMomentDemandNmm, 6000000);

const overhangException = loadCase.exceptionLedger.find((row) => (
  row.code === 'OVERHANG_CANTILEVER_TRANSFER' && row.entityId === 'OVERHANG-3KN'
));
assert.ok(overhangException);
assert.equal(overhangException.verticalForceN, 3000);
assert.equal(overhangException.eccentricityMm, 2000);
assert.equal(overhangException.momentDemandNmm, 6000000);

const unsupportedException = loadCase.exceptionLedger.find((row) => (
  row.code === 'UNALLOCATED_FORCE_NO_QUALIFIED_VERTICAL_SUPPORT'
  && row.entityId === 'BRANCH-3KN'
));
assert.ok(unsupportedException);
assert.equal(unsupportedException.verticalForceN, 3000);
assert.equal(unsupportedException.firstMomentNmm, 15000000);

const branch = loadCase.contributionLedger.find((row) => row.entityId === 'BRANCH-3KN');
assert.ok(branch);
assert.equal(branch.allocations.length, 0, 'unsupported branch must not receive an invented reaction path');
assert.equal(branch.unallocated[0].verticalForceN, 3000);
assert.equal(loadCase.supportResults.some((row) => row.contributorIds.includes(branch.contributionId)), false);

console.log(JSON.stringify({
  status: 'PASS',
  benchmark: 'ISSUE1321_FULL_18KN_PARTIAL_DISTRIBUTION',
  resultStatus: result.status,
  evaluatedForceN: loadCase.completenessAudit.evaluatedForceN,
  allocatedForceN: loadCase.completenessAudit.allocatedForceN,
  unallocatedForceN: loadCase.completenessAudit.unallocatedForceN,
  coverageRatio: loadCase.completenessAudit.coverageRatio,
  boundaryTransferMomentNmm: loadCase.completenessAudit.boundaryTransferMomentNmm,
  forceResidualN: loadCase.equilibrium.forceResidualN,
  momentResidualNmm: loadCase.equilibrium.momentResidualNmm,
}, null, 2));

function makeProfile() {
  const empty = createEmptyProjectDataProfile();
  const source = (value, sourceKey, sourceHash) => createEvidenceValue(
    value,
    { source: 'ISSUE1321_FIXTURE', sourceKey, sourceHash },
    true,
  );
  const approved = (value, sourceName) => createEvidenceValue(value, { source: sourceName }, true);
  return {
    ...empty,
    projectId: 'ISSUE1321-PROJECT',
    revision: 1,
    updatedAt: '2026-08-22T08:40:00.000Z',
    sourcesAndUnits: {
      ...empty.sourcesAndUnits,
      lineListSource: source({ sha256: hashes.lineList }, 'lineList', hashes.lineList),
      pipingClassSource: source({ sha256: hashes.pipingClass }, 'pipingClass', hashes.pipingClass),
      componentWeightSource: source({ sha256: hashes.componentWeight }, 'componentWeight', hashes.componentWeight),
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
      materialDensitiesKgPerM3: approved({ DUMMY: 7850 }, 'ISSUE1321_UNUSED_PIPE_BASIS'),
      pipeSectionProperties: approved({
        DUMMY: {
          outsideDiameterMm: 100,
          wallThicknessMm: 5,
          materialCode: 'DUMMY',
          insulationCode: 'NONE',
          insulationThicknessMm: 0,
        },
      }, 'ISSUE1321_UNUSED_PIPE_BASIS'),
      operatingFluidDensitiesKgPerM3: approved({ DEFAULT: 800 }, 'ISSUE1321_UNUSED_FLUID_BASIS'),
      hydroFluidDensitiesKgPerM3: approved({ DEFAULT: 1000 }, 'ISSUE1321_UNUSED_FLUID_BASIS'),
      insulationDensitiesKgPerM3: approved({ NONE: 0 }, 'ISSUE1321_UNUSED_INSULATION_BASIS'),
      componentWeightsKg: approved({
        'BRACKETED-12KN': 12000,
        'OVERHANG-3KN': 3000,
        'BRANCH-3KN': 3000,
      }, 'ISSUE1321_COMPONENT_MASSES'),
      equilibriumTolerances: approved({ forceN: 1e-9, momentNmm: 1e-6 }, 'ISSUE1321_EQUILIBRIUM'),
      activeLoadCases: approved(['EMPTY'], 'ISSUE1321_LOAD_BASIS'),
    },
  };
}

function makeDataset() {
  return {
    datasetId: 'ISSUE1321-18KN',
    version: 1,
    sourceSha256: hashes.dataset,
    entities: [
      pointEntity('BRACKETED-12KN'),
      pointEntity('OVERHANG-3KN'),
      pointEntity('BRANCH-3KN'),
    ],
  };
}

function pointEntity(id) {
  return {
    entityId: id,
    entityType: 'VALVE',
    lineKey: id,
    sourceEntityId: `SRC-${id}`,
    jsonPointer: `/components/${id}`,
    componentReference: id,
    properties: { attributes: { CATALOG_KEY: id } },
  };
}

function makeSupportSites() {
  return {
    schema: 'support-site-model/v1',
    status: 'READY',
    sites: [
      support('S-A', 0, 0),
      support('S-B', 10000, 0),
      support('S-C', 10000, 10000),
    ],
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

function makeRoutes() {
  return {
    schema: 'route-partition-model/v1',
    status: 'READY',
    routes: [
      route('R-BRACKETED', 'CARRIER-1', 'BRACKETED-12KN', 0, 10000, 4000, 0),
      route('R-OVERHANG', 'CARRIER-2', 'OVERHANG-3KN', 10000, 12000, 12000, 10000),
      route('R-BRANCH', 'CARRIER-3', 'BRANCH-3KN', 0, 10000, 5000, 20000),
    ],
    edges: [
      carrier('CARRIER-1', 0, 10000, 0),
      pointEdge('BRACKETED-12KN', 4000, 0),
      carrier('CARRIER-2', 10000, 12000, 10000),
      pointEdge('OVERHANG-3KN', 12000, 10000),
      carrier('CARRIER-3', 0, 10000, 20000),
      pointEdge('BRANCH-3KN', 5000, 20000),
    ],
  };
}

function route(routeId, carrierId, componentId, startChainageMm, endChainageMm, pointChainageMm, y) {
  return {
    routeId,
    status: 'READY',
    blockers: [],
    physicalEdgeIds: [componentId],
    entityChainages: [
      {
        entityId: carrierId,
        startMm: startChainageMm,
        endMm: endChainageMm,
        pointMm: (startChainageMm + endChainageMm) / 2,
        sourceStartChainageMm: startChainageMm,
        sourceEndChainageMm: endChainageMm,
      },
      {
        entityId: componentId,
        startMm: pointChainageMm,
        endMm: pointChainageMm,
        pointMm: pointChainageMm,
        sourceStartChainageMm: pointChainageMm,
        sourceEndChainageMm: pointChainageMm,
      },
    ],
    fixturePlaneY: y,
  };
}

function carrier(entityId, startX, endX, y) {
  return {
    entityId,
    entityType: 'PIPE',
    lengthMm: Math.abs(endX - startX),
    pointComponent: false,
    topologyCarrier: false,
    startMm: { x: startX, y, z: 0 },
    endMm: { x: endX, y, z: 0 },
  };
}

function pointEdge(entityId, x, y) {
  return {
    entityId,
    entityType: 'VALVE',
    lengthMm: 0,
    pointComponent: true,
    topologyCarrier: false,
    startMm: { x, y, z: 0 },
    endMm: { x, y, z: 0 },
  };
}
