import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createNonFeaWorkspaceStatusProjection,
  validateNonFeaWorkspaceStatusProjection,
} from '../src/core/non-fea-common-checker/workspace-status-projection.js';

const base = projectionInput({
  total: 43,
  covered: 38,
  missing: [
    'VALVE-004:COMPONENT_WEIGHT',
    'PIPE-017:OPERATING_FLUID',
    'FLANGE-011:COMPONENT_WEIGHT',
    'INST-003:COMPONENT_WEIGHT',
    'PIPE-021:PIPE_MASS',
  ],
});

const partial = createNonFeaWorkspaceStatusProjection(base);
const coverage = partial.commonInput.methodRows[0].coverageRequirements[0];
assert.equal(coverage.requirementId, 'MASS_COVERAGE');
assert.equal(coverage.code, 'MASS_COVERAGE_INCOMPLETE');
assert.equal(coverage.total, 43);
assert.equal(coverage.covered, 38);
assert.equal(coverage.missing.length, 5);
assert.equal(coverage.ready, false);
assert.equal(coverage.state, 'BLOCKED');
assert.equal(partial.gates.find((row) => row.gateId === 'F_METHOD_READINESS')?.state, 'BLOCKED');
assert.equal(validateNonFeaWorkspaceStatusProjection(partial), partial);

const nearlyResolved = createNonFeaWorkspaceStatusProjection(projectionInput({
  total: 43,
  covered: 42,
  missing: ['VALVE-004:COMPONENT_WEIGHT'],
}));
assert.equal(nearlyResolved.commonInput.methodRows[0].coverageRequirements[0].ready, false);
assert.equal(nearlyResolved.gates.find((row) => row.gateId === 'F_METHOD_READINESS')?.state, 'BLOCKED');
assert.notEqual(
  partial.semanticHash,
  nearlyResolved.semanticHash,
  'different missing coverage evidence must produce different workspace-status evidence',
);
assert.deepEqual(
  partial.commonInput.methodRows[0].blockerCodes,
  nearlyResolved.commonInput.methodRows[0].blockerCodes,
  'progress evidence must not rewrite the engineering blocker code',
);

assert.throws(
  () => createNonFeaWorkspaceStatusProjection(projectionInput({
    total: 43,
    covered: 42,
    missing: ['VALVE-004:COMPONENT_WEIGHT'],
    ready: true,
  })),
  /ready state disagrees with its missing evidence/u,
  'coverage evidence must fail closed when ready contradicts missing evidence',
);
assert.throws(
  () => createNonFeaWorkspaceStatusProjection(projectionInput({
    total: 43,
    covered: 42,
    missing: ['VALVE-004:COMPONENT_WEIGHT'],
    state: 'READY',
  })),
  /gate state disagrees with its ready state/u,
  'presentation progress must not promote a blocked coverage requirement',
);
assert.throws(
  () => createNonFeaWorkspaceStatusProjection(projectionInput({
    total: 43,
    covered: 41,
    missing: ['VALVE-004:COMPONENT_WEIGHT', 'VALVE-004:COMPONENT_WEIGHT'],
  })),
  /Duplicate coverage MASS_COVERAGE missing evidence/u,
  'coverage evidence must not silently deduplicate contradictory input',
);

const runtimeSource = readFileSync(new URL('../src/workspace/non-fea-analysis-plan-runtime.js', import.meta.url), 'utf8');
assert.match(runtimeSource, /row\.requirements\s*\|\|\s*\[\]/u, 'workspace runtime must read checker requirement rows');
assert.match(runtimeSource, /coverageRequirements/u, 'workspace runtime must retain coverage requirement evidence');

const checkerSource = readFileSync(new URL('../src/core/non-fea-common-checker/index.js', import.meta.url), 'utf8');
assert.match(
  checkerSource,
  /ready:\s*normalized\.length\s*===\s*0/u,
  'coverageResult ready semantics must remain all-or-nothing',
);

const inputCheckViewSource = readFileSync(new URL('../src/workspace/non-fea-input-check-view.js', import.meta.url), 'utf8');
assert.match(
  inputCheckViewSource,
  /SECTION_COVERAGE_INCOMPLETE:\s*Object\.freeze\(\{\s*tab:\s*'enrichment'/u,
  'section coverage must navigate to its owning enrichment surface',
);
assert.match(
  inputCheckViewSource,
  /FLEXURAL_COVERAGE_INCOMPLETE:\s*Object\.freeze\(\{\s*tab:\s*'enrichment'/u,
  'flexural coverage must navigate to its owning enrichment surface',
);
assert.match(
  inputCheckViewSource,
  /MASS_COVERAGE_INCOMPLETE:\s*Object\.freeze\(\{\s*tab:\s*'enrichment'/u,
  'mass coverage must navigate to its owning enrichment surface',
);
assert.match(
  inputCheckViewSource,
  /MASTER_NOT_READY:\s*Object\.freeze\(\{\s*tab:\s*'masters'/u,
  'master readiness must navigate to Import Masters rather than enrichment',
);
assert.match(inputCheckViewSource, /SHARED CAUSE/u, 'shared causes must be labeled explicitly');
assert.match(inputCheckViewSource, /SINGLE CAUSE/u, 'single-scope causes must be labeled explicitly');
assert.match(inputCheckViewSource, /GATE ROLLUP/u, 'derived gate rollups must be labeled explicitly');

const enrichmentViewSource = readFileSync(new URL('../src/workspace/enrichment/non-fea-enrichment-view.js', import.meta.url), 'utf8');
assert.match(
  enrichmentViewSource,
  /PIPE_OUTER_DIAMETER:\s*Object\.freeze\(\['SECTION_COVERAGE_INCOMPLETE',\s*'MASS_COVERAGE_INCOMPLETE'\]\)/u,
  'pipe diameter evidence must disclose only section and mass coverage dependencies',
);
assert.doesNotMatch(
  enrichmentViewSource,
  /PIPE_OUTER_DIAMETER:[^\n]*FLEXURAL_COVERAGE_INCOMPLETE/u,
  'pipe diameter evidence must not claim flexural coverage impact without a governed I derivation',
);
assert.match(
  enrichmentViewSource,
  /PIPE_WALL_THICKNESS:\s*Object\.freeze\(\['SECTION_COVERAGE_INCOMPLETE',\s*'MASS_COVERAGE_INCOMPLETE'\]\)/u,
  'pipe wall-thickness evidence must disclose only section and mass coverage dependencies',
);
assert.match(
  enrichmentViewSource,
  /ELASTIC_MODULUS:\s*Object\.freeze\(\['FLEXURAL_COVERAGE_INCOMPLETE'\]\)/u,
  'elastic modulus evidence must disclose its flexural coverage dependency',
);
assert.match(
  enrichmentViewSource,
  /SECOND_MOMENT_AREA:\s*Object\.freeze\(\['FLEXURAL_COVERAGE_INCOMPLETE'\]\)/u,
  'second-moment evidence must disclose its flexural coverage dependency',
);
assert.match(
  enrichmentViewSource,
  /FLEXURAL_RIGIDITY:\s*Object\.freeze\(\['FLEXURAL_COVERAGE_INCOMPLETE'\]\)/u,
  'direct flexural-rigidity evidence must disclose its flexural coverage dependency',
);
assert.match(
  enrichmentViewSource,
  /OPERATING_FLUID_WEIGHT:\s*Object\.freeze\(\['MASS_COVERAGE_INCOMPLETE'\]\)/u,
  'operating-fluid weight evidence must disclose its mass coverage dependency',
);
assert.match(
  enrichmentViewSource,
  /only the common checker can clear a blocker/u,
  'enrichment must not present dependency disclosure as readiness authority',
);

console.log('Non-FEA Validate Input coverage projection anti-drift check passed.');

function projectionInput({ total, covered, missing, ready = false, state = 'BLOCKED' }) {
  return {
    source: {
      workspaceState: 'ready',
      datasetId: 'COVERAGE-PROJECTION-FIXTURE',
      sourceDatasetSha256: 'a'.repeat(64),
      sourceModelSemanticHash: 'fnv1a64:1111111111111111',
    },
    topology: {
      supportSiteStatus: 'READY',
      supportSiteSemanticHash: 'fnv1a64:2222222222222222',
      supportSiteCount: 2,
      routePartitionStatus: 'READY',
      routePartitionSemanticHash: 'fnv1a64:3333333333333333',
      routeCount: 1,
    },
    projectData: {
      revision: 1,
      profileSemanticHash: 'fnv1a64:4444444444444444',
      originKind: 'SIMULATED',
      originSource: 'non-fea-input-check-coverage-projection-check',
      audits: {
        normalization: { valid: true, errorCodes: [] },
        topology: { valid: true, errorCodes: [] },
        loads: { valid: true, errorCodes: [] },
      },
    },
    masters: [
      { masterKey: 'lineList', required: true, rowCount: 1, sourceHash: 'line-list' },
      { masterKey: 'pipingClass', required: true, rowCount: 1, sourceHash: 'piping-class' },
      { masterKey: 'weight', required: true, rowCount: 1, sourceHash: 'weight' },
    ],
    enrichment: {
      currentSourceSemanticHash: 'fnv1a64:1111111111111111',
      boundSourceSemanticHash: 'fnv1a64:1111111111111111',
      stale: false,
      proposalCount: 0,
      acceptedRecordCount: 0,
      migrationBlockerCodes: [],
    },
    commonInput: {
      requestedMethodIds: ['WEIGHT_AND_GRAVITY'],
      requestedLoadCaseIds: ['OPE'],
      error: null,
      reportPackageState: 'BLOCKED',
      reportSemanticHash: 'fnv1a64:5555555555555555',
      candidateSemanticHash: 'fnv1a64:6666666666666666',
      readyMethodIds: [],
      blockedMethodIds: ['WEIGHT_AND_GRAVITY'],
      methodRows: [{
        methodId: 'WEIGHT_AND_GRAVITY',
        state: 'BLOCKED',
        blockerCodes: ['MASS_COVERAGE_INCOMPLETE'],
        coverageRequirements: [{
          requirementId: 'MASS_COVERAGE',
          state,
          code: 'MASS_COVERAGE_INCOMPLETE',
          total,
          covered,
          missing,
          ready,
        }],
      }],
      requestSourceModelSemanticHash: 'fnv1a64:1111111111111111',
      requestResolutionLedgerStatus: 'READY',
      requestResolutionLedgerSemanticHash: 'fnv1a64:7777777777777777',
      requestEnrichmentSidecarSemanticHash: 'fnv1a64:8888888888888888',
      requestQualificationProfileSemanticHash: null,
      commonInputPackageState: null,
      commonInputSemanticHash: null,
      sealedMethodIds: [],
      commonInputStale: false,
      stalenessCodes: [],
      exportSemanticHash: null,
      authorizationReceiptCount: 0,
      executionReceiptCount: 0,
    },
    implementation: {
      registrySemanticHash: 'fnv1a64:9999999999999999',
      implementations: [],
    },
    execution: {
      empiricalScenarioState: 'NOT_EVALUATED',
      empiricalAuthorizationState: 'NOT_AUTHORIZED',
      empiricalAuthorizationReasonCode: 'COMMON_INPUT_REQUIRED',
    },
  };
}
