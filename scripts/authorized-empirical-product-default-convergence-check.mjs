#!/usr/bin/env node

import assert from 'node:assert/strict';
import { semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import {
  createEmptyProjectDataProfile,
  createEvidenceValue,
} from '../src/workspace/project-data/project-data-contract.js';
import {
  buildAuthorizedEmpiricalLoadProfile,
} from '../src/workspace/engineering-loads/authorized-empirical-load-execution.js';
import {
  computeAuthorizedEmpiricalLoadInputSemanticHash,
  requireAuthorizedEmpiricalLoadInput,
} from '../src/workspace/engineering-loads/authorized-empirical-load-input.js';

const authorizedInput = makeAuthorizedInput();
const emptyProfile = projectProfile();
const emptyBefore = semanticHash(emptyProfile);
const effective = buildAuthorizedEmpiricalLoadProfile(emptyProfile, authorizedInput);

assert.equal(semanticHash(emptyProfile), emptyBefore,
  'authorized profile construction must not mutate stored Project Data');
assert.equal(effective.loadCalculation.gravityMPerS2.value, 9.80665);
assert.equal(effective.loadCalculation.gravityMPerS2.evidence.authority, 'PRODUCT_DEFAULT');
assert.equal(effective.loadCalculation.gravityMPerS2.evidence.defaultId, 'PD-GRAVITY');
assert.equal(effective.loadCalculation.loadFactor.value, 1);
assert.equal(effective.loadCalculation.loadFactor.evidence.authority, 'PRODUCT_DEFAULT');
assert.deepEqual(effective.loadCalculation.activeLoadCases.value, ['EMPTY', 'OPE', 'HYD']);
assert.equal(effective.loadCalculation.activeLoadCases.evidence.authority, 'PRODUCT_DEFAULT');

for (const field of [
  'pipeSectionProperties',
  'materialDensitiesKgPerM3',
  'operatingFluidDensitiesKgPerM3',
  'hydroFluidDensitiesKgPerM3',
  'insulationDensitiesKgPerM3',
  'componentWeightsKg',
]) {
  assert.deepEqual(effective.loadCalculation[field].value, authorizedInput.loadCalculationOverlay[field]);
  assert.equal(effective.loadCalculation[field].evidence.source, 'AUTHORIZED_EMPIRICAL_LOAD_INPUT');
  assert.equal(effective.loadCalculation[field].evidence.sourceSemanticHash, authorizedInput.semanticHash);
}

const governedProfile = projectProfile({
  gravityMPerS2: createEvidenceValue(9.81, {
    source: 'PROJECT_ENGINEERING_POLICY',
    authority: 'PROJECT_POLICY',
  }, true),
  loadFactor: createEvidenceValue(1.15, {
    source: 'PROJECT_ENGINEERING_POLICY',
    authority: 'PROJECT_POLICY',
  }, true),
  activeLoadCases: createEvidenceValue(['EMPTY', 'OPE'], {
    source: 'PROJECT_ENGINEERING_POLICY',
    authority: 'PROJECT_POLICY',
  }, true),
});
const governedBefore = semanticHash(governedProfile);
const governedEffective = buildAuthorizedEmpiricalLoadProfile(governedProfile, authorizedInput);
assert.equal(semanticHash(governedProfile), governedBefore);
assert.equal(governedEffective.loadCalculation.gravityMPerS2.value, 9.81,
  'product gravity must not displace project policy');
assert.equal(governedEffective.loadCalculation.gravityMPerS2.evidence.authority, 'PROJECT_POLICY');
assert.equal(governedEffective.loadCalculation.loadFactor.value, 1.15,
  'product load factor must not displace project policy');
assert.deepEqual(governedEffective.loadCalculation.activeLoadCases.value, ['EMPTY', 'OPE'],
  'product case set must not displace project policy');

assert.notEqual(semanticHash(effective), semanticHash(governedEffective),
  'effective profile hash must change when higher-authority project values change');

console.log(JSON.stringify({
  status: 'PASS',
  productGravity: effective.loadCalculation.gravityMPerS2.value,
  productLoadFactor: effective.loadCalculation.loadFactor.value,
  productCases: effective.loadCalculation.activeLoadCases.value,
  governedGravity: governedEffective.loadCalculation.gravityMPerS2.value,
  governedLoadFactor: governedEffective.loadCalculation.loadFactor.value,
  governedCases: governedEffective.loadCalculation.activeLoadCases.value,
  authorizedOverlayHash: authorizedInput.overlaySemanticHash,
  effectiveProfileSemanticHash: semanticHash(effective),
}, null, 2));

function projectProfile(loadCalculationOverrides = {}) {
  const empty = createEmptyProjectDataProfile();
  return {
    ...empty,
    projectId: 'PROJECT-EFFECTIVE-AUTH',
    revision: 7,
    updatedAt: '2026-08-22T09:45:00.000Z',
    loadCalculation: {
      ...empty.loadCalculation,
      ...loadCalculationOverrides,
    },
  };
}

function makeAuthorizedInput() {
  const loadCalculationOverlay = {
    pipeSectionProperties: {
      'L-1': {
        outsideDiameterMm: 100,
        wallThicknessMm: 5,
        materialCode: 'MAT-1',
        insulationCode: null,
        insulationThicknessMm: 0,
      },
    },
    materialDensitiesKgPerM3: { 'MAT-1': 7850 },
    operatingFluidDensitiesKgPerM3: { 'L-1': 800 },
    hydroFluidDensitiesKgPerM3: { 'L-1': 1000 },
    insulationDensitiesKgPerM3: {},
    componentWeightsKg: { 'VALVE-1': 10 },
  };
  const draft = {
    schema: 'authorized-empirical-load-input/v1',
    intakeId: 'INTAKE-EFFECTIVE-AUTH',
    projectId: 'PROJECT-EFFECTIVE-AUTH',
    baselineId: 'BASELINE-EFFECTIVE-AUTH',
    baselineRevision: 1,
    baselineSemanticHash: 'fnv1a64:1111111111111111',
    readinessEvaluationSemanticHash: 'fnv1a64:2222222222222222',
    readinessSemanticHash: 'fnv1a64:3333333333333333',
    handoffSemanticHash: 'fnv1a64:4444444444444444',
    projectionPayloadSemanticHash: 'fnv1a64:5555555555555555',
    adapterVersion: 'effective-authority-check/1.0.0',
    configurationHash: 'fnv1a64:6666666666666666',
    createdAt: '2026-08-22T09:44:00.000Z',
    lineBindings: [{
      targetId: 'line:001',
      sourceRecordId: 'source-line-001',
      lineKey: 'L-1',
      projectionRecordSemanticHash: 'fnv1a64:7777777777777777',
    }],
    componentBindings: [{
      targetId: 'component:001',
      sourceRecordId: 'source-component-001',
      lineKey: 'L-1',
      catalogKey: 'VALVE-1',
      projectionRecordSemanticHash: 'fnv1a64:8888888888888888',
    }],
    loadCalculationOverlay,
    overlaySemanticHash: semanticHash(loadCalculationOverlay),
    summary: {
      lineCount: 1,
      componentCount: 1,
      materialCodeCount: 1,
      insulationCodeCount: 0,
      componentCatalogCount: 1,
    },
    semanticHash: 'fnv1a64:0000000000000000',
  };
  return requireAuthorizedEmpiricalLoadInput({
    ...draft,
    semanticHash: computeAuthorizedEmpiricalLoadInputSemanticHash(draft),
  });
}
