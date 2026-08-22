#!/usr/bin/env node

import assert from 'node:assert/strict';
import { semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import {
  createEmptyProjectDataProfile,
  projectDataValue,
  replaceProjectDataValue,
} from '../src/workspace/project-data/project-data-contract.js';
import {
  createNonFeaProductDefaultProvider,
} from '../src/workspace/project-data/non-fea-product-default-profile.js';
import {
  NON_FEA_FLUID_FILL_POLICY_SCHEMA,
} from '../src/workspace/project-data/non-fea-fluid-fill-policy.js';
import {
  createNonFeaEffectiveValueCandidate,
  resolveNonFeaEffectiveValues,
} from '../src/workspace/project-data/non-fea-effective-value-resolver.js';
import {
  AUTHORIZED_EMPIRICAL_EFFECTIVE_VALUE_LEDGER_SCHEMA,
} from '../src/workspace/engineering-loads/authorized-empirical-effective-value-ledger.js';
import {
  createAuthorizedEmpiricalEffectiveExecutionProjection,
} from '../src/workspace/engineering-loads/authorized-empirical-effective-execution-projection.js';

const SH = Object.freeze({
  handoff: 'fnv1a64:1111111111111111',
  baseline: 'fnv1a64:2222222222222222',
  authorizedInput: 'fnv1a64:3333333333333333',
});
const ledger = makeLedger();
const input = makeAuthorizedInput(ledger);
const dataset = {
  datasetId: 'FILL-COMPOSITION-DATASET',
  version: 1,
  sourceSha256: '1'.repeat(64),
  entities: [],
};

const profile60 = effectiveProfile({
  schema: NON_FEA_FLUID_FILL_POLICY_SCHEMA,
  cases: {
    OPE: { fillFraction: 0.6, phase: 'MIXED' },
    HYD: 'LIQUID_FULL',
  },
});
const projection60 = createAuthorizedEmpiricalEffectiveExecutionProjection({
  authorizedInput: input,
  dataset,
  profile: profile60,
});
const operating60 = projectDataValue(
  projection60.profile,
  'loadCalculation.operatingFluidDensitiesKgPerM3',
)['L-1'];
const hydro60 = projectDataValue(
  projection60.profile,
  'loadCalculation.hydroFluidDensitiesKgPerM3',
)['L-1'];
assert.equal(operating60.rawDensityKgPerM3, 800);
assert.equal(operating60.fillFraction, 0.6);
assert.equal(operating60.selected, 480);
assert.equal(operating60.phase, 'MIXED');
assert.equal(hydro60.rawDensityKgPerM3, 1000);
assert.equal(hydro60.fillFraction, 1);
assert.equal(hydro60.selected, 1000);
assert.equal(projection60.fluidCompositionRows.length, 2);
assert.equal(projection60.fluidCompositionRule,
  'BULK_DENSITY=AUTHORIZED_RAW_DENSITY*GOVERNED_FILL_FRACTION');

const opeReceipt60 = projection60.fluidCompositionRows.find((row) => row.loadCaseId === 'OPE');
assert.ok(opeReceipt60);
assert.equal(opeReceipt60.rawDensityKgPerM3, 800);
assert.equal(opeReceipt60.bulkDensityKgPerM3, 480);
assert.equal(opeReceipt60.fillFraction, 0.6);
assert.equal(opeReceipt60.rawDensitySemanticHash, operating60.rawDensitySemanticHash);
assert.equal(opeReceipt60.fillPolicySemanticHash, operating60.fillPolicySemanticHash);
assert.equal(opeReceipt60.semanticHash, operating60.compositionSemanticHash);

const opeEvidence60 = projection60.profile.loadCalculation
  .operatingFluidDensitiesKgPerM3.evidence;
assert.equal(opeEvidence60.source, 'AUTHORIZED_EMPIRICAL_EFFECTIVE_VALUE_LEDGER');
assert.equal(opeEvidence60.massCompositionRule,
  'BULK_DENSITY=AUTHORIZED_RAW_DENSITY*GOVERNED_FILL_FRACTION');
assert.equal(opeEvidence60.fluidCompositionBySelector['L-1'].rawDensityKgPerM3, 800);
assert.equal(opeEvidence60.fluidCompositionBySelector['L-1'].fillFraction, 0.6);
assert.equal(opeEvidence60.fluidCompositionBySelector['L-1'].bulkDensityKgPerM3, 480);

const profile80 = effectiveProfile({
  schema: NON_FEA_FLUID_FILL_POLICY_SCHEMA,
  cases: {
    OPE: { fillFraction: 0.8, phase: 'MIXED' },
    HYD: 'LIQUID_FULL',
  },
});
const projection80 = createAuthorizedEmpiricalEffectiveExecutionProjection({
  authorizedInput: input,
  dataset,
  profile: profile80,
});
const operating80 = projectDataValue(
  projection80.profile,
  'loadCalculation.operatingFluidDensitiesKgPerM3',
)['L-1'];
assert.equal(operating80.selected, 640);
assert.equal(operating80.rawDensityKgPerM3, 800);
assert.equal(operating80.rawDensitySemanticHash, operating60.rawDensitySemanticHash,
  'raw density authority must remain unchanged when only fill policy changes');
assert.notEqual(operating80.fillPolicySemanticHash, operating60.fillPolicySemanticHash);
assert.notEqual(projection80.semanticHash, projection60.semanticHash,
  'fill-policy change must stale the execution projection');

const legacy = effectiveProfile({ DEFAULT: 'LIQUID_FULL' });
const legacyProjection = createAuthorizedEmpiricalEffectiveExecutionProjection({
  authorizedInput: input,
  dataset,
  profile: legacy,
});
assert.equal(projectDataValue(
  legacyProjection.profile,
  'loadCalculation.operatingFluidDensitiesKgPerM3',
)['L-1'].selected, 800);
assert.equal(projectDataValue(
  legacyProjection.profile,
  'loadCalculation.hydroFluidDensitiesKgPerM3',
)['L-1'].selected, 1000);

assert.throws(
  () => createAuthorizedEmpiricalEffectiveExecutionProjection({
    authorizedInput: input,
    dataset,
    profile: effectiveProfile({
      schema: NON_FEA_FLUID_FILL_POLICY_SCHEMA,
      cases: { OPE: { fillFraction: 0, phase: 'EMPTY' }, HYD: 'LIQUID_FULL' },
    }),
  }),
  (error) => error?.code === 'EMPIRICAL_FLUID_ZERO_FILL_NONEMPTY_CASE_UNSUPPORTED',
);

console.log(JSON.stringify({
  status: 'PASS',
  benchmark: 'ISSUE1321_AUTHORIZED_FLUID_MASS_COMPOSITION',
  rawOperatingDensityKgPerM3: 800,
  opeFill60BulkDensityKgPerM3: operating60.selected,
  opeFill80BulkDensityKgPerM3: operating80.selected,
  rawDensityHashStableAcrossFillChange: true,
  projectionHashChangesWithFillPolicy: projection80.semanticHash !== projection60.semanticHash,
  legacyFullPolicyPreserved: true,
  zeroNonemptyFillFailsClosed: true,
}, null, 2));

function effectiveProfile(fillPolicy) {
  let profile = createEmptyProjectDataProfile();
  profile = replaceProjectDataValue(
    profile,
    'thermoMechanicalBasis.fluidPhaseAndFillState',
    fillPolicy,
    { source: 'FILL_POLICY_FIXTURE', authority: 'PROJECT_POLICY' },
    true,
  );
  return createNonFeaProductDefaultProvider({ profile }).effectiveProfile;
}

function makeAuthorizedInput(effectiveValueLedger) {
  return Object.freeze({
    handoffSemanticHash: SH.handoff,
    baselineSemanticHash: SH.baseline,
    semanticHash: SH.authorizedInput,
    effectiveValueLedger,
    lineBindings: [{
      targetId: 'LINE:L-1',
      sourceRecordId: 'PIPE-SRC',
      lineKey: 'L-1',
    }],
    componentBindings: [],
  });
}

function makeLedger() {
  const candidates = [
    candidate('PIPE_OUTER_DIAMETER', 100, 'mm'),
    candidate('PIPE_WALL_THICKNESS', 5, 'mm'),
    candidate('MATERIAL_DENSITY', 7850, 'kg/m3'),
    candidate('OPERATING_FLUID_DENSITY', 800, 'kg/m3'),
    candidate('HYDRO_FLUID_DENSITY', 1000, 'kg/m3'),
    candidate('INSULATION_THICKNESS', 0, 'mm'),
  ];
  const resolved = resolveNonFeaEffectiveValues({ candidates });
  assert.equal(resolved.status, 'RESOLVED');
  const material = {
    schema: AUTHORIZED_EMPIRICAL_EFFECTIVE_VALUE_LEDGER_SCHEMA,
    handoffSemanticHash: SH.handoff,
    baselineSemanticHash: SH.baseline,
    resolutionSemanticHash: resolved.semanticHash,
    status: resolved.status,
    rows: resolved.rows,
    summary: resolved.summary,
  };
  return Object.freeze({ ...material, semanticHash: semanticHash(material) });
}

function candidate(fieldId, value, unit) {
  return createNonFeaEffectiveValueCandidate({
    candidateId: `LINE:L-1:${fieldId}`,
    targetKind: 'LINE',
    targetId: 'LINE:L-1',
    fieldId,
    value,
    unit,
    authority: 'EXACT_APPROVED_MASTER',
    sourceId: `MASTER:L-1:${fieldId}`,
    evidence: { source: 'fixture master' },
  });
}
