#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  createEmptyProjectDataProfile,
  replaceProjectDataValue,
} from '../src/workspace/project-data/project-data-contract.js';
import {
  createNonFeaProductDefaultProvider,
} from '../src/workspace/project-data/non-fea-product-default-profile.js';
import { buildSupportSiteModel } from '../src/workspace/support-sites/support-site-model.js';
import { buildRoutePartitionModel } from '../src/workspace/routes/route-partition-model.js';
import {
  calculateSupportLoadDistributionFromQualifiedCaseMasses,
} from '../src/workspace/engineering-loads/support-load-distribution-v3.js';
import {
  bindAuthorizedEmpiricalSourceAxis,
} from '../src/workspace/engineering-loads/authorized-empirical-source-axis-binding.js';
import {
  bindAuthorizedEmpiricalGravityConventions,
} from '../src/workspace/engineering-loads/authorized-empirical-gravity-convention-binding.js';

const z = runCase('Z', identity);
const y = runCase('Y', swapYZ);

assert.equal(z.supportSites.sourceAxisBasis, 'Z_UP');
assert.equal(y.supportSites.sourceAxisBasis, 'Y_UP');
assert.equal(z.bound.sourceAxisBasis, 'Z_UP');
assert.equal(y.bound.sourceAxisBasis, 'Y_UP');
assert.equal(z.bound.resultSignConvention, 'SOURCE_UP_POSITIVE_SUPPORT_REACTION');
assert.equal(y.bound.resultSignConvention, 'SOURCE_UP_POSITIVE_SUPPORT_REACTION');

assert.deepEqual(chainages(z.routes), chainages(y.routes),
  'route chainage must be invariant under Y/Z coordinate permutation');
assertClose(forceAtTag(z, 'SA'), forceAtTag(y, 'SA'), 1e-9, 'start support reaction');
assertClose(forceAtTag(z, 'SC'), forceAtTag(y, 'SC'), 1e-9, 'end support reaction');
assertClose(z.loadCase.completenessAudit.evaluatedForceN,
  y.loadCase.completenessAudit.evaluatedForceN, 1e-9, 'evaluated force');
assertClose(z.loadCase.equilibrium.forceResidualN,
  y.loadCase.equilibrium.forceResidualN, 1e-9, 'force residual');
assertClose(z.loadCase.equilibrium.momentResidualNmm,
  y.loadCase.equilibrium.momentResidualNmm, 1e-6, 'moment residual');
assert.equal(z.loadCase.status, 'CALCULATED');
assert.equal(y.loadCase.status, 'CALCULATED');
assert.equal(z.loadCase.exceptionLedger.length, 0);
assert.equal(y.loadCase.exceptionLedger.length, 0);

const route = z.routes.routes[0];
const valveChainage = route.entityChainages.find((row) => row.entityId === 'V1').pointMm;
const totalLength = route.totalLengthMm;
const forceN = 100 * 9.80665;
assertClose(forceAtTag(z, 'SA'), forceN * (totalLength - valveChainage) / totalLength,
  1e-9, 'hand lever reaction at start support');
assertClose(forceAtTag(z, 'SC'), forceN * valveChainage / totalLength,
  1e-9, 'hand lever reaction at end support');

console.log(JSON.stringify({
  status: 'PASS',
  benchmark: 'ISSUE1321_SOURCE_AXIS_PERMUTATION_EQUIVALENCE',
  comparedAxes: ['Z', 'Y'],
  routeChainageInvariant: true,
  supportReactionInvariant: true,
  forceEquilibriumInvariant: true,
  momentEquilibriumInvariant: true,
  yUpGovernedResultBasis: y.bound.sourceAxisBasis,
  resultSignConvention: y.bound.resultSignConvention,
}, null, 2));

function runCase(axis, transform) {
  const dataset = makeDataset(transform);
  const profile = effectiveProfile(axis);
  const supportSites = buildSupportSiteModel(dataset, profile);
  const routes = buildRoutePartitionModel(dataset, profile);
  assert.equal(supportSites.status, 'READY');
  assert.equal(routes.status, 'READY');
  assert.equal(routes.routes.length, 1);

  const raw = calculateSupportLoadDistributionFromQualifiedCaseMasses({
    dataset,
    profile,
    supportSiteModel: supportSites,
    routePartitionModel: routes,
    masterData: {},
  }, [
    qualifiedMass('P1', 0),
    qualifiedMass('V1', 100),
    qualifiedMass('P2', 0),
  ]);
  const axisBound = bindAuthorizedEmpiricalSourceAxis({ distribution: raw, profile });
  const bound = bindAuthorizedEmpiricalGravityConventions({ distribution: axisBound, profile });
  return { dataset, profile, supportSites, routes, raw, bound, loadCase: bound.loadCases[0] };
}

function effectiveProfile(axis) {
  let profile = createEmptyProjectDataProfile();
  profile = replaceProjectDataValue(profile, 'sourcesAndUnits.sourceUpAxis', axis,
    { source: 'AXIS_PERMUTATION_FIXTURE', authority: 'SOURCE_EXPLICIT' }, true);
  profile = replaceProjectDataValue(profile, 'loadCalculation.activeLoadCases', ['EMPTY'],
    { source: 'AXIS_PERMUTATION_FIXTURE', authority: 'PROJECT_POLICY' }, true);
  profile = replaceProjectDataValue(profile, 'topology.supportTypeCapabilities', {
    REST: { vertical: true },
  }, { source: 'AXIS_PERMUTATION_FIXTURE', authority: 'PROJECT_POLICY' }, true);
  return createNonFeaProductDefaultProvider({ profile }).effectiveProfile;
}

function makeDataset(transform) {
  const a = transform({ x: 0, y: 1000, z: 2000 });
  const b = transform({ x: 3000, y: 5000, z: 6000 });
  const c = transform({ x: 10000, y: 9000, z: 12000 });
  return {
    datasetId: 'ISSUE1321-AXIS-PERMUTATION',
    version: 1,
    sourceSha256: 'a'.repeat(64),
    entities: [
      pipingEntity('P1', 'PIPE', a, b),
      pipingEntity('V1', 'VALVE', b, b),
      pipingEntity('P2', 'PIPE', b, c),
      supportEntity('S-A', 'SA', a),
      supportEntity('S-C', 'SC', c),
    ],
  };
}

function pipingEntity(entityId, entityType, start, end) {
  return {
    entityId,
    entityType,
    category: 'piping',
    branchId: 'B1',
    lineKey: 'L1',
    sourceEntityId: `SRC-${entityId}`,
    componentReference: entityId,
    jsonPointer: `/entities/${entityId}`,
    properties: { geometry: { start, end }, attributes: {} },
  };
}

function supportEntity(entityId, tag, center) {
  return {
    entityId,
    entityType: 'SUPPORT',
    category: 'support',
    branchId: 'B1',
    lineKey: 'L1',
    sourceEntityId: `SRC-${entityId}`,
    componentReference: entityId,
    jsonPointer: `/supports/${entityId}`,
    properties: {
      geometry: { center },
      attributes: { SUPPORT_TAG: tag, SUPPORT_TYPE: 'REST' },
    },
  };
}

function qualifiedMass(entityId, massKg) {
  return {
    entityId,
    loadCaseId: 'EMPTY',
    massKg,
    source: { kind: 'AXIS_PERMUTATION_QUALIFIED_MASS', entityId },
  };
}

function chainages(model) {
  return model.routes[0].entityChainages
    .map(({ entityId, startMm, endMm, pointMm }) => ({ entityId, startMm, endMm, pointMm }))
    .sort((left, right) => left.entityId.localeCompare(right.entityId));
}

function forceAtTag(run, tag) {
  const site = run.supportSites.sites.find((candidate) => candidate.tags.includes(tag));
  assert.ok(site, `missing support tag ${tag}`);
  const result = run.loadCase.supportResults.find((candidate) => candidate.supportSiteId === site.siteId);
  assert.ok(result, `missing result for support ${tag}`);
  return result.verticalForceN;
}

function assertClose(actual, expected, tolerance, label) {
  assert.ok(Number.isFinite(actual) && Number.isFinite(expected), `${label} must be finite`);
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, received ${actual}`);
}

function identity(point) { return { ...point }; }
function swapYZ(point) { return { x: point.x, y: point.z, z: point.y }; }
