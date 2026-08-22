#!/usr/bin/env node

import assert from 'node:assert/strict';
import { semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import {
  createEmptyProjectDataProfile,
  replaceProjectDataValue,
} from '../src/workspace/project-data/project-data-contract.js';
import {
  NON_FEA_COMPONENT_MASS_POLICY_SCHEMA,
  resolveNonFeaComponentMassPolicy,
  validateNonFeaComponentMassPolicy,
} from '../src/workspace/project-data/non-fea-component-mass-policy.js';
import {
  createNonFeaProductDefaultProvider,
} from '../src/workspace/project-data/non-fea-product-default-profile.js';
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

const productProfile = createNonFeaProductDefaultProvider({
  profile: createEmptyProjectDataProfile(),
}).effectiveProfile;
const productResolution = resolveNonFeaComponentMassPolicy({
  profile: productProfile,
  targetId: 'COMPONENT:C1',
  componentType: 'VALVE',
});
assert.equal(productResolution.mode, 'COMPONENT_EXPLICIT_POINT_MASS');
assert.equal(productResolution.sourceAuthority, 'PRODUCT_DEFAULT');

const projectProfile = policyProfile({
  schema: NON_FEA_COMPONENT_MASS_POLICY_SCHEMA,
  defaultMode: 'COMPONENT_EXPLICIT_POINT_MASS',
  componentTypes: { VALVE: 'COMPONENT_DERIVED_GEOMETRIC_MASS' },
  components: { 'COMPONENT:C1': 'COMPONENT_EQUIVALENT_LENGTH_MASS' },
});
assert.equal(resolveNonFeaComponentMassPolicy({
  profile: projectProfile,
  targetId: 'COMPONENT:C1',
  componentType: 'VALVE',
}).mode, 'COMPONENT_EQUIVALENT_LENGTH_MASS');
assert.equal(resolveNonFeaComponentMassPolicy({
  profile: projectProfile,
  targetId: 'COMPONENT:C2',
  componentType: 'VALVE',
}).mode, 'COMPONENT_DERIVED_GEOMETRIC_MASS');
assert.equal(resolveNonFeaComponentMassPolicy({
  profile: projectProfile,
  targetId: 'COMPONENT:C3',
  componentType: 'FLANGE',
}).mode, 'COMPONENT_EXPLICIT_POINT_MASS');
assert.equal(validateNonFeaComponentMassPolicy({
  schema: NON_FEA_COMPONENT_MASS_POLICY_SCHEMA,
  defaultMode: 'COMPONENT_EXPLICIT_POINT_MASS',
}).valid, true);
assert.equal(validateNonFeaComponentMassPolicy({
  schema: NON_FEA_COMPONENT_MASS_POLICY_SCHEMA,
  defaultMode: 'DOUBLE_COUNT_BOTH',
}).valid, false);

const validProjection = createAuthorizedEmpiricalEffectiveExecutionProjection({
  authorizedInput: authorizedInput([
    ['COMPONENT:C1', 10],
    ['COMPONENT:C2', 20],
  ], [
    binding('COMPONENT:C1', 'src-c1'),
    binding('COMPONENT:C2', 'src-c2'),
  ]),
  dataset: dataset([
    entity('c1', 'VALVE', 'src-c1'),
    entity('c2', 'FLANGE', 'src-c2'),
  ]),
  profile: productProfile,
});
assert.equal(validProjection.componentMassCompositionRows.length, 2);
assert.ok(validProjection.componentMassCompositionRows.every(
  (row) => row.mode === 'COMPONENT_EXPLICIT_POINT_MASS',
));
assert.equal(validProjection.componentMassCompositionRule,
  'ONE_DRY_MASS_POLICY_PER_PHYSICAL_COMPONENT');
for (const mapping of validProjection.componentMappings) {
  assert.equal(mapping.massCompositionPolicy, 'COMPONENT_EXPLICIT_POINT_MASS');
  assert.ok(mapping.massCompositionSemanticHash);
}

expectCode(
  () => createAuthorizedEmpiricalEffectiveExecutionProjection({
    authorizedInput: authorizedInput([['COMPONENT:C1', 10]], [binding('COMPONENT:C1', 'src-c1')]),
    dataset: dataset([entity('c1', 'VALVE', 'src-c1')]),
    profile: policyProfile({
      schema: NON_FEA_COMPONENT_MASS_POLICY_SCHEMA,
      defaultMode: 'COMPONENT_DERIVED_GEOMETRIC_MASS',
    }),
  }),
  'EMPIRICAL_COMPONENT_MASS_MODE_UNSUPPORTED',
);

expectCode(
  () => createAuthorizedEmpiricalEffectiveExecutionProjection({
    authorizedInput: authorizedInput([
      ['COMPONENT:C1', 10],
      ['COMPONENT:C2', 20],
    ], [
      binding('COMPONENT:C1', 'src-shared'),
      binding('COMPONENT:C2', 'src-shared'),
    ]),
    dataset: dataset([entity('shared', 'VALVE', 'src-shared')]),
    profile: productProfile,
  }),
  'EMPIRICAL_COMPONENT_DRY_MASS_MULTIPLE_CLAIMS',
);

expectCode(
  () => createAuthorizedEmpiricalEffectiveExecutionProjection({
    authorizedInput: authorizedInput([['COMPONENT:C1', 10]], [binding('COMPONENT:C1', 'src-pipe')]),
    dataset: dataset([entity('pipe-1', 'PIPE', 'src-pipe')]),
    profile: productProfile,
  }),
  'EMPIRICAL_COMPONENT_DRY_MASS_PIPE_CONFLICT',
);

console.log(JSON.stringify({
  status: 'PASS',
  benchmark: 'ISSUE1321_COMPONENT_DRY_MASS_COMPOSITION',
  productMode: productResolution.mode,
  exactComponentPrecedence: 'COMPONENT_EQUIVALENT_LENGTH_MASS',
  componentTypePrecedence: 'COMPONENT_DERIVED_GEOMETRIC_MASS',
  activeProjectionMode: 'COMPONENT_EXPLICIT_POINT_MASS',
  unimplementedModeFailsClosed: true,
  duplicatePhysicalEntityClaimFailsClosed: true,
  pipeDistributedPointMassConflictFailsClosed: true,
}, null, 2));

function policyProfile(value) {
  let profile = createEmptyProjectDataProfile();
  profile = replaceProjectDataValue(
    profile,
    'loadCalculation.componentMassCompositionPolicy',
    value,
    { source: 'COMPONENT_MASS_POLICY_FIXTURE', authority: 'PROJECT_POLICY' },
    true,
  );
  return createNonFeaProductDefaultProvider({ profile }).effectiveProfile;
}

function binding(targetId, sourceRecordId) {
  return { targetId, sourceRecordId, lineKey: 'L1' };
}

function entity(entityId, entityType, sourceEntityId) {
  return {
    entityId,
    entityType,
    sourceEntityId,
    lineKey: 'L1',
    properties: { attributes: { CATALOG_KEY: 'RAW' } },
  };
}

function dataset(entities) {
  return {
    datasetId: 'COMPONENT-MASS-DATASET',
    version: 1,
    sourceSha256: '1'.repeat(64),
    entities,
  };
}

function authorizedInput(weightRows, componentBindings) {
  const candidates = weightRows.map(([targetId, value]) => createNonFeaEffectiveValueCandidate({
    candidateId: `${targetId}:COMPONENT_WEIGHT`,
    targetKind: 'COMPONENT',
    targetId,
    fieldId: 'COMPONENT_WEIGHT',
    value,
    unit: 'kg',
    authority: 'EXACT_APPROVED_MASTER',
    sourceId: `MASTER:${targetId}`,
    evidence: { source: 'component mass fixture' },
  }));
  const resolved = resolveNonFeaEffectiveValues({ candidates });
  assert.equal(resolved.status, 'RESOLVED');
  const ledgerMaterial = {
    schema: AUTHORIZED_EMPIRICAL_EFFECTIVE_VALUE_LEDGER_SCHEMA,
    handoffSemanticHash: 'fnv1a64:1111111111111111',
    baselineSemanticHash: 'fnv1a64:2222222222222222',
    resolutionSemanticHash: resolved.semanticHash,
    status: resolved.status,
    rows: resolved.rows,
    summary: resolved.summary,
  };
  const effectiveValueLedger = Object.freeze({
    ...ledgerMaterial,
    semanticHash: semanticHash(ledgerMaterial),
  });
  return Object.freeze({
    handoffSemanticHash: ledgerMaterial.handoffSemanticHash,
    baselineSemanticHash: ledgerMaterial.baselineSemanticHash,
    semanticHash: 'fnv1a64:3333333333333333',
    effectiveValueLedger,
    lineBindings: [],
    componentBindings,
  });
}

function expectCode(fn, code) {
  assert.throws(fn, (error) => {
    assert.equal(error?.code, code);
    return true;
  });
}
