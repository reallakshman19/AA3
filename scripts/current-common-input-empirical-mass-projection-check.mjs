#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  NON_FEA_COMMON_SCHEMAS,
} from '../src/core/non-fea-common-checker/index.js';
import { buildModelLoadFoundation } from '../src/core/model-loads/model-load-foundation.js';
import { buildPipingPortTopologyGraph } from '../src/core/piping-topology/index.js';
import {
  createSharedPipingModel,
  semanticHash,
} from '../src/core/shared-piping-model/index.js';
import {
  createEvidenceValue,
  createEmptyProjectDataProfile,
} from '../src/workspace/project-data/project-data-contract.js';
import {
  createNonFeaEmpiricalRunAuthorization,
} from '../src/workspace/engineering-loads/non-fea-empirical-run-authorization.js';
import {
  CURRENT_COMMON_INPUT_EMPIRICAL_MASS_PROJECTION_SCHEMA,
  createCurrentCommonInputEmpiricalMassProjection,
  requireCurrentCommonInputEmpiricalMassProjection,
  requireCurrentCurrentCommonInputEmpiricalMassProjection,
} from '../src/workspace/engineering-loads/current-common-input-empirical-mass-projection.js';

const AUTHORIZED_AT = '2026-08-26T12:48:00.000Z';
const model = makeModel();
const topologyGraph = buildPipingPortTopologyGraph(model);
const modelLoadFoundation = buildModelLoadFoundation(model, topologyGraph);
const loadPrimitiveSet = modelLoadFoundation.loadPrimitiveSet;
const profile = projectProfile();
const readySnapshot = snapshot(commonInput(model, profile, loadPrimitiveSet));
const runAuthorization = createNonFeaEmpiricalRunAuthorization(readySnapshot, {
  authorizedAt: AUTHORIZED_AT,
});
const projection = createCurrentCommonInputEmpiricalMassProjection({
  snapshot: readySnapshot,
  runAuthorization,
  loadPrimitiveSet,
});

assert.equal(projection.schema, CURRENT_COMMON_INPUT_EMPIRICAL_MASS_PROJECTION_SCHEMA);
assert.deepEqual(requireCurrentCommonInputEmpiricalMassProjection(projection), projection);
assert.deepEqual(
  requireCurrentCurrentCommonInputEmpiricalMassProjection(projection, {
    snapshot: readySnapshot,
    runAuthorization,
    loadPrimitiveSet,
  }),
  projection,
);
assert.equal(projection.loadPrimitiveSetSemanticHash, loadPrimitiveSet.semanticHash);
assert.equal(projection.policy.projectionOnly, true);
assert.equal(projection.policy.executionAuthorizationGranted, false);
assert.equal(projection.policy.legacyPublicationOrHandoffAuthorityAsserted, false);
assert.equal(projection.policy.sealedLoadPrimitiveSetRequired, true);
assert.equal(projection.policy.directMassBasisPreserved, true);
assert.equal(projection.policy.fittingDerivationPreserved, true);
assert.equal(projection.policy.negligibleMassZeroPreserved, true);
assert.equal(projection.policy.ancillaryMassIncluded, true);
assert.equal(projection.policy.componentContainedFluidIncluded, true);
assert.equal(projection.policy.supportStaticsExecuted, false);
assert.equal(projection.summary.entityCount, 4);
assert.equal(projection.summary.entityCaseCount, 12);
assert.equal(projection.summary.zeroMassEntityCaseCount, 3);

const pipe = entity('PIPE-A');
assert.deepEqual(caseMasses(pipe), { EMPTY: 28, HYD: 34, OPE: 32 });
assert.equal(caseRow(pipe, 'EMPTY').sourceMassPerLengthKgPerM, 11);
assert.equal(caseRow(pipe, 'EMPTY').claddingMassPerLengthKgPerM, 2);
assert.equal(caseRow(pipe, 'EMPTY').tracingMassPerLengthKgPerM, 1);
assert.equal(caseRow(pipe, 'EMPTY').totalMassPerLengthKgPerM, 14);
assert.equal(caseRow(pipe, 'EMPTY').sourceLengthM, 2);
assert.equal(caseRow(pipe, 'OPE').sourceMassPerLengthKgPerM, 13);
assert.equal(caseRow(pipe, 'HYD').sourceMassPerLengthKgPerM, 14);
assert.deepEqual(
  caseRow(pipe, 'EMPTY').sourceMassBreakdown.map((row) => row.sourceId),
  ['PIPE_METAL', 'INSULATION'],
);
assert.ok(caseRow(pipe, 'EMPTY').sourceMassBreakdown.every((row) => row.sourceEvidence),
  'direct kg/m mass basis must remain source evidence in the sealed primitive');
assert.equal(
  caseRow(pipe, 'EMPTY').formulaTrace.some((trace) => trace.formulaId === 'PIPE_METAL_MASS_PER_LENGTH_V1'),
  false,
  'direct PIPE kg/m authority must not be rewritten as a derived section formula',
);
assert.equal(caseRow(pipe, 'EMPTY').ancillaryEvidence.length, 2);

const fitting = entity('ELBO-A');
assert.equal(
  caseRow(fitting, 'EMPTY').basePrimitiveSourceEvidence?.source,
  'DERIVED_FROM_ADJACENT_PIPE_SECTION',
  'fitting mass must be retained from the sealed model-load primitive derivation',
);
assert.equal(caseRow(fitting, 'EMPTY').massKg, caseRow(fitting, 'OPE').massKg);
assert.equal(caseRow(fitting, 'EMPTY').massKg, caseRow(fitting, 'HYD').massKg);
assert.equal(caseRow(fitting, 'EMPTY').mode, 'POINT');

const gasket = entity('GASK-A');
assert.deepEqual(caseMasses(gasket), { EMPTY: 0, HYD: 0, OPE: 0 });
assert.equal(caseRow(gasket, 'EMPTY').dryPointMassKg, 0);
assert.ok(caseRow(gasket, 'EMPTY').diagnostics.some((row) => row.code === 'EXCLUDED_NEGLIGIBLE_MASS'));

const valve = entity('VALVE-A');
assert.deepEqual(caseMasses(valve), { EMPTY: 100, HYD: 110, OPE: 108 });
assert.equal(caseRow(valve, 'EMPTY').containedFluidMassKg, 0);
assert.equal(caseRow(valve, 'OPE').containedFluidMassKg, 8);
assert.equal(caseRow(valve, 'HYD').containedFluidMassKg, 10);
assert.equal(caseRow(valve, 'OPE').dryPointMassKg, 100);
assert.equal(caseRow(valve, 'OPE').containedFluidEvidence.sourceKind, 'PROJECT_CONFIGURED_DEFAULT');

for (const forbidden of ['baselineId', 'handoffId', 'authorityId', 'publicationDecision']) {
  assert.equal(Object.hasOwn(projection, forbidden), false,
    `${forbidden} must not be synthesized by the current Common Input projection`);
}

const forgedPolicy = rehashProjection(projection, {
  policy: { ...projection.policy, executionAuthorizationGranted: true },
});
expectCode(
  () => requireCurrentCommonInputEmpiricalMassProjection(forgedPolicy),
  'CURRENT_COMMON_INPUT_EMPIRICAL_MASS_POLICY_INVALID',
);

const tamperedRows = structuredClone(projection.entityRows);
const pipeIndex = tamperedRows.findIndex((row) => row.entityId === 'PIPE-A');
tamperedRows[pipeIndex].cases[0].massKg += 1;
const tamperedMass = rehashProjection(projection, { entityRows: tamperedRows });
expectCode(
  () => requireCurrentCommonInputEmpiricalMassProjection(tamperedMass),
  'CURRENT_COMMON_INPUT_EMPIRICAL_MASS_COMPOSITION_INVALID',
);

const forgedSummary = rehashProjection(projection, {
  summary: { ...projection.summary, zeroMassEntityCaseCount: 999 },
});
expectCode(
  () => requireCurrentCommonInputEmpiricalMassProjection(forgedSummary),
  'CURRENT_COMMON_INPUT_EMPIRICAL_MASS_SUMMARY_INVALID',
);

const differentPrimitiveMaterial = structuredClone(loadPrimitiveSet);
const differentPrimitive = differentPrimitiveMaterial.primitives.find((row) => (
  row.componentKey === 'VALVE-A'
  && row.loadCaseId === 'EMPTY'
  && row.primitiveType === 'POINT_GRAVITY_LOAD'
));
differentPrimitive.pointMassKg = 101;
differentPrimitive.pointForceN = differentPrimitive.pointForceN / 100 * 101;
delete differentPrimitiveMaterial.semanticHash;
const differentPrimitiveSet = {
  ...differentPrimitiveMaterial,
  semanticHash: semanticHash(differentPrimitiveMaterial),
};
expectCode(
  () => createCurrentCommonInputEmpiricalMassProjection({
    snapshot: readySnapshot,
    runAuthorization,
    loadPrimitiveSet: differentPrimitiveSet,
  }),
  'CURRENT_COMMON_INPUT_EMPIRICAL_LOAD_PRIMITIVE_BINDING_MISMATCH',
);

const forgedPrimitiveBinding = rehashProjection(projection, {
  loadPrimitiveSetSemanticHash: semanticHash({ wrong: 'primitive-set' }),
});
expectCode(
  () => requireCurrentCurrentCommonInputEmpiricalMassProjection(forgedPrimitiveBinding, {
    snapshot: readySnapshot,
    runAuthorization,
    loadPrimitiveSet,
  }),
  'CURRENT_COMMON_INPUT_EMPIRICAL_MASS_PROJECTION_STALE',
);

const resealedInput = commonInput(model, profile, loadPrimitiveSet, {
  seal: {
    semanticHash: semanticHash({ seal: 'second' }),
    confirmedBy: 'different READY seal',
  },
});
const resealedSnapshot = snapshot(resealedInput);
expectCode(
  () => requireCurrentCurrentCommonInputEmpiricalMassProjection(projection, {
    snapshot: resealedSnapshot,
    runAuthorization,
    loadPrimitiveSet,
  }),
  'NON_FEA_EMPIRICAL_RUN_AUTHORIZATION_SEAL_STALE',
);

const source = readFileSync(new URL(
  '../src/workspace/engineering-loads/current-common-input-empirical-mass-projection.js',
  import.meta.url,
), 'utf8');
assert.match(source, /validateModelLoadPrimitiveSet/u,
  'projection must validate the exact sealed model-load primitive set');
assert.match(source, /createNonFeaCommonEnrichedConfiguredDefaultOverlay/u,
  'ancillary projection must reuse the existing exact configured-default overlay');
assert.doesNotMatch(source, /resolveComponentCaseMass|derivePipeLikeFittingWeightEvidence/u,
  'projection must not independently rerun base mass resolution after sealing');
assert.doesNotMatch(source, /authorized-empirical-load-input/u,
  'projection must not depend on legacy authorized empirical input');
assert.doesNotMatch(source, /common-enriched-consumer-handoff/u,
  'projection must not synthesize legacy consumer handoff authority');
assert.doesNotMatch(source, /calculateSupportLoadDistribution|allocateSupport/u,
  'projection must not execute support statics');

console.log(JSON.stringify({
  status: 'PASS',
  benchmark: 'ISSUE1321_CURRENT_COMMON_INPUT_EMPIRICAL_MASS_PROJECTION',
  schema: projection.schema,
  commonInputSemanticHash: projection.commonInputSemanticHash,
  runAuthorizationSemanticHash: projection.runAuthorizationSemanticHash,
  loadPrimitiveSetSemanticHash: projection.loadPrimitiveSetSemanticHash,
  entityCount: projection.summary.entityCount,
  entityCaseCount: projection.summary.entityCaseCount,
  sealedPrimitiveBasePreserved: true,
  directMassBasisPreserved: true,
  fittingDerivedMassPreserved: true,
  negligibleGasketZeroPreserved: true,
  ancillaryMassPreserved: true,
  componentContainedFluidPreserved: true,
  legacyPublicationHandoffSynthesized: false,
  supportStaticsExecuted: false,
}, null, 2));

function entity(entityId) {
  const row = projection.entityRows.find((item) => item.entityId === entityId);
  assert.ok(row, `missing projection entity ${entityId}`);
  return row;
}

function caseRow(entityRow, loadCaseId) {
  const row = entityRow.cases.find((item) => item.loadCaseId === loadCaseId);
  assert.ok(row, `missing ${entityRow.entityId}:${loadCaseId}`);
  return row;
}

function caseMasses(entityRow) {
  return Object.fromEntries(entityRow.cases.map((row) => [row.loadCaseId, row.massKg]));
}

function snapshot(commonInputValue) {
  return {
    commonInput: commonInputValue,
    staleness: { stale: false, changes: [] },
    error: '',
  };
}

function commonInput(sharedModel, projectDataProfile, primitiveSet, overrides = {}) {
  const base = {
    schema: NON_FEA_COMMON_SCHEMAS.COMMON_INPUT,
    packageState: 'READY',
    requestSemanticHash: semanticHash({ request: 'mass-projection' }),
    reportSemanticHash: semanticHash({ report: 'mass-projection' }),
    candidateSemanticHash: semanticHash({ candidate: 'mass-projection' }),
    sourceDatasetSha256: 'a'.repeat(64),
    sourceModelSemanticHash: sharedModel.semanticHash,
    enrichmentSidecarSemanticHash: semanticHash({ sidecar: 'mass-projection' }),
    resolutionLedgerSemanticHash: semanticHash({ resolution: 'mass-projection' }),
    enrichedProjectionSemanticHash: semanticHash({ projection: 'mass-projection' }),
    projectDataProfileSemanticHash: semanticHash(projectDataProfile),
    configuredDefaultUsageLedgerSemanticHash: null,
    qualificationProfileSemanticHash: null,
    requestedLoadCases: ['EMPTY', 'HYD', 'OPE'],
    sealedMethodIds: ['SUSTAINED_REACTIONS', 'WEIGHT_AND_GRAVITY'],
    blockedMethodIds: [],
    enrichedModel: sharedModel,
    resolutionLedger: { schema: 'fixture-resolution/v1' },
    projectDataProfile,
    configuredDefaultUsageLedger: null,
    qualificationProfile: null,
    authorityContracts: {
      topologyGraph: contract('topology'),
      supportAttachmentModel: contract('attachment'),
      restraintCapabilityModel: contract('restraint'),
      supportSiteModel: contract('support-site'),
      routePartitionModel: contract('route'),
      loadPrimitiveSet: {
        schema: primitiveSet.schema,
        status: 'READY',
        semanticHash: primitiveSet.semanticHash,
      },
    },
    methodReadiness: [],
    lineage: { schema: 'fixture-lineage/v1' },
    seal: {
      semanticHash: semanticHash({ seal: 'first' }),
      confirmedBy: 'fixture READY seal',
    },
  };
  const material = { ...base, ...overrides };
  return { ...material, semanticHash: semanticHash(material) };
}

function contract(id) {
  return {
    schema: `fixture-${id}/v1`,
    status: 'READY',
    semanticHash: semanticHash({ contract: id }),
  };
}

function projectProfile() {
  const empty = createEmptyProjectDataProfile();
  return {
    ...empty,
    projectId: 'CURRENT-MASS-PROJECTION-PROJECT',
    revision: 1,
    updatedAt: '2026-08-26T12:45:00.000Z',
    qualificationPolicy: {
      ...empty.qualificationPolicy,
      configuredDefaults: createEvidenceValue({
        schema: 'non-fea-configured-default-policy/v1',
        defaults: [
          ancillaryDefault('PROJECT-CLADDING', 'CLADDING_WEIGHT', 2),
          ancillaryDefault('PROJECT-TRACING', 'TRACING_WEIGHT', 1),
        ],
      }, {
        source: 'Focused current Common Input mass projection fixture',
      }, true),
    },
  };
}

function ancillaryDefault(defaultId, fieldId, value) {
  return {
    defaultId,
    fieldId,
    value,
    unit: 'kg/m',
    basis: 'Qualified permanent ancillary distributed mass for projection parity.',
    allowedMethods: ['WEIGHT_AND_GRAVITY'],
    scope: { lineIds: ['L-1'] },
  };
}

function makeModel() {
  return createSharedPipingModel({
    project: {
      datasetId: 'CURRENT-MASS-PROJECTION-DATASET',
      name: 'Current mass projection fixture',
      sourceName: 'fixture',
    },
    units: { length: 'mm', force: 'N', mass: 'kg' },
    sourceSnapshotRef: {
      schema: 'source-package-snapshot/v1',
      datasetId: 'CURRENT-MASS-PROJECTION-DATASET',
      sourceSchema: 'fixture/v1',
      sourceSemanticHash: semanticHash({ source: 'current-mass-projection' }),
      sourceByteHash: null,
    },
    components: [
      component({
        key: 'PIPE-A',
        type: 'PIPE',
        start: point(0),
        end: point(2000),
        engineeringProperties: {
          unitPipeWeightKgPerM: evidence(10, 'kg/m', 'UNIT_PIPE_WEIGHT_KG_PER_M'),
          outerDiameterMm: evidence(100, 'mm', 'OUTSIDE_DIAMETER_MM'),
          wallThicknessMm: evidence(5, 'mm', 'WALL_THICKNESS_MM'),
          materialDensityKgM3: evidence(7850, 'kg/m3', 'MATERIAL_DENSITY_KG_M3'),
          insulationWeightKgPerM: evidence(1, 'kg/m', 'INSULATION_WEIGHT_KG_PER_M'),
          insulationThicknessMm: evidence(0, 'mm', 'INSULATION_THICKNESS_MM'),
          fluidWeightOpeKgPerM: evidence(2, 'kg/m', 'FLUID_WEIGHT_OPE_KG_PER_M'),
          fluidWeightHydKgPerM: evidence(3, 'kg/m', 'FLUID_WEIGHT_HYD_KG_PER_M'),
        },
      }),
      component({ key: 'ELBO-A', type: 'ELBO', start: point(2000), end: point(2100) }),
      component({ key: 'GASK-A', type: 'GASK', start: point(2100), end: point(2110) }),
      component({
        key: 'VALVE-A',
        type: 'VALVE',
        start: point(2110),
        end: point(2210),
        engineeringProperties: {
          componentWeightKg: evidence(100, 'kg', 'COMPONENT_WEIGHT_KG'),
          componentFluidWeightOpeKg: configuredEvidence(8, 'kg', 'COMPONENT_OPERATING_FLUID_WEIGHT'),
          componentFluidWeightHydKg: configuredEvidence(10, 'kg', 'COMPONENT_HYDRO_FLUID_WEIGHT'),
        },
      }),
    ],
    supports: [],
    sourceReferences: { nodes: [] },
    diagnostics: [],
  });
}

function component({ key, type, start, end, engineeringProperties = {} }) {
  const center = {
    x: (start.x + end.x) / 2,
    y: 0,
    z: 0,
  };
  return {
    componentKey: key,
    sourceEntityId: key,
    name: key,
    type,
    identity: { lineId: 'L-1', branchId: 'B-1', systemId: 'SYS-1', zoneId: 'Z-1' },
    geometry: {
      start,
      end,
      center,
      points: [start, end],
      branchPoints: [],
      explicitCenter: type !== 'PIPE',
      boreMm: null,
      ports: [port(key, 'start', start), port(key, 'end', end)],
      sources: {
        start: `${key}.start`,
        end: `${key}.end`,
        center: type === 'PIPE' ? 'derived.midpoint' : `${key}.center`,
        branches: [],
      },
    },
    engineeringProperties,
    compatibilityEvidence: {},
    sourceReferences: {
      sourceNodeKey: `node:${key}`,
      sourceEntityId: key,
      jsonPointer: `/objects/${key}`,
      sourcePath: `/MODEL/${key}`,
    },
    diagnostics: [],
  };
}

function point(x) { return { x, y: 0, z: 0 }; }
function port(key, role, position) {
  return {
    portKey: `${key}:port:${role}`,
    role,
    position,
    sourceReference: { sourcePath: `${key}.${role}` },
  };
}
function evidence(value, unit, field) {
  return {
    value,
    unit,
    sourcePath: `sourceAttributes.${field}`,
    sourceRoot: 'sourceAttributes',
    sourceKind: 'sourceAttributes',
  };
}
function configuredEvidence(value, unit, field) {
  return {
    value,
    unit,
    sourcePath: `nonFeaEnrichment.${field}`,
    sourceRoot: 'PROJECT_CONFIGURED_DEFAULT',
    sourceKind: 'PROJECT_CONFIGURED_DEFAULT',
  };
}

function rehashProjection(value, patch) {
  const material = { ...structuredClone(value), ...patch };
  delete material.semanticHash;
  return { ...material, semanticHash: semanticHash(material) };
}

function expectCode(fn, code) {
  assert.throws(fn, (error) => {
    assert.equal(error?.code, code, error?.stack || error?.message);
    return true;
  });
}
