/** Non-solving Stage 13 preflight for authoritative LAFEA.3 domain-first execution. */
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';
import {
  buildLafeaContinuumCompiledExecutionInput,
} from './lafea-continuum-compiled-input.js';
import {
  LAFEA_CONTINUUM_SOLVER_COMPILER_ID,
  LAFEA_CONTINUUM_SOLVER_COMPILER_REVISION,
} from './lafea-continuum-solver-model.js';
import { compileLafeaContinuumWorkbenchContext } from './lafea-continuum-workbench-route.js';
import { qualifyLafeaMeshTopologyV3 } from './lafea-mesh-topology-qualification-v3.js';
import { qualifyLafeaHighOrderJacobiansV3 } from './lafea-high-order-jacobian-qualification-v3.js';

export const LAFEA_CONTINUUM_DOMAIN_FIRST_PREFLIGHT_SCHEMA =
  'lafea-continuum-domain-first-preflight/v1';
export const LAFEA_CONTINUUM_DOMAIN_FIRST_PREFLIGHT_PRODUCER =
  'STAGE13/LAFEA.3/DOMAIN_FIRST_COMPILED_PREFLIGHT/13.3';

const STAGE_ID = 'LAFEA.3';
const CAPABILITIES = Object.freeze([
  'SOURCE', 'SCHEMA', 'UNIT', 'GEOMETRY', 'TOPOLOGY', 'GLOBAL_MESH_TOPOLOGY',
  'FULL_PARENT_JACOBIAN', 'MATERIAL', 'SECTION', 'RESTRAINT', 'LOAD',
  'PHYSICAL_CASE', 'CONSTRAINT', 'MESH_CUSTODY', 'SOLVER_MODEL_COMPILATION',
  'EXECUTION_INPUT_LOWERING',
]);
const HIGH_ORDER_JACOBIAN_POLICY = Object.freeze({
  minimumDeterminant: 0,
  maximumDepth: 12,
  maximumSubregions: 8192,
  authority: 'SOURCE_CONTROLLED_FAIL_CLOSED_CERTIFICATION_RESOURCE_POLICY',
});
const SEALED_KEYS = Object.freeze([
  'schema', 'stageId', 'producerRef', 'sourceHash', 'analysisDomainHash',
  'analysisGeometryHash', 'meshHash', 'meshProfileHash', 'solverModelHash',
  'compilerId', 'compilerRevision', 'requestedCaseIds', 'capabilityIds',
  'topologyQualificationHash', 'highOrderJacobianQualificationHash',
  'highOrderJacobianPolicy', 'status', 'findings', 'solverExecuted',
  'executionAuthorized', 'releaseQualified', 'semanticHash',
]);

export function createLafeaContinuumDomainFirstPreflight(context, stageId = STAGE_ID) {
  if (stageId !== STAGE_ID) fail('LAFEA_CONTINUUM_PREFLIGHT_STAGE_NOT_AUTHORIZED');
  const compiled = compileLafeaContinuumWorkbenchContext(context, stageId);
  buildLafeaContinuumCompiledExecutionInput(compiled.solverModel);

  // Additional fail-closed checks on the already-current stage mesh. These
  // qualifiers can veto execution but never promote mesh or release authority.
  const topology = qualifyLafeaMeshTopologyV3(
    compiled.meshEvidence.mesh,
    { requireSingleComponent: true },
  );
  if (topology.qualification !== 'PASS') {
    fail('LAFEA_CONTINUUM_PREFLIGHT_GLOBAL_MESH_TOPOLOGY_BLOCKED');
  }
  const jacobian = qualifyLafeaHighOrderJacobiansV3(
    compiled.meshEvidence.mesh,
    HIGH_ORDER_JACOBIAN_POLICY,
  );
  if (jacobian.qualification !== 'PASS') {
    fail('LAFEA_CONTINUUM_PREFLIGHT_FULL_PARENT_JACOBIAN_BLOCKED');
  }

  const record = {
    schema: LAFEA_CONTINUUM_DOMAIN_FIRST_PREFLIGHT_SCHEMA,
    stageId,
    producerRef: LAFEA_CONTINUUM_DOMAIN_FIRST_PREFLIGHT_PRODUCER,
    sourceHash: compiled.sourceAuthority.sourceHash,
    analysisDomainHash: compiled.analysisDomain.semanticHash,
    analysisGeometryHash: compiled.geometryEvidence.analysisGeometryHash,
    meshHash: compiled.meshEvidence.meshHash,
    meshProfileHash: compiled.meshEvidence.meshProfileHash,
    solverModelHash: compiled.solverModel.solverModelHash,
    compilerId: compiled.solverModel.compilerId,
    compilerRevision: compiled.solverModel.compilerRevision,
    requestedCaseIds: [...compiled.solverModel.requestedCaseIds],
    capabilityIds: [...CAPABILITIES],
    topologyQualificationHash: topology.qualificationHash,
    highOrderJacobianQualificationHash: jacobian.qualificationHash,
    highOrderJacobianPolicy: { ...HIGH_ORDER_JACOBIAN_POLICY },
    status: 'PASS',
    findings: [],
    solverExecuted: false,
    executionAuthorized: true,
    releaseQualified: false,
  };
  return freeze({
    ...record,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea-continuum-domain-first-preflight-hash-input/v1',
      evidence: record,
    }),
  });
}

export function validateLafeaContinuumDomainFirstPreflight(value) {
  exact(value, SEALED_KEYS);
  if (value.schema !== LAFEA_CONTINUUM_DOMAIN_FIRST_PREFLIGHT_SCHEMA
    || value.stageId !== STAGE_ID
    || value.producerRef !== LAFEA_CONTINUUM_DOMAIN_FIRST_PREFLIGHT_PRODUCER
    || value.compilerId !== LAFEA_CONTINUUM_SOLVER_COMPILER_ID
    || value.compilerRevision !== LAFEA_CONTINUUM_SOLVER_COMPILER_REVISION
    || value.status !== 'PASS' || value.solverExecuted !== false
    || value.executionAuthorized !== true || value.releaseQualified !== false
    || !Array.isArray(value.findings) || value.findings.length !== 0
    || JSON.stringify(value.capabilityIds) !== JSON.stringify(CAPABILITIES)
    || !validCaseIds(value.requestedCaseIds)
    || typeof value.meshProfileHash !== 'string' || !value.meshProfileHash.trim()
    || !validHighOrderJacobianPolicy(value.highOrderJacobianPolicy)) {
    fail('LAFEA_CONTINUUM_PREFLIGHT_INVALID');
  }
  for (const key of [
    'sourceHash', 'analysisDomainHash', 'analysisGeometryHash', 'meshHash',
    'solverModelHash', 'topologyQualificationHash',
    'highOrderJacobianQualificationHash', 'semanticHash',
  ]) {
    if (!/^sha256:[0-9a-f]{64}$/u.test(value[key] ?? '')) {
      fail('LAFEA_CONTINUUM_PREFLIGHT_HASH_INVALID');
    }
  }
  const copy = structuredClone(value);
  delete copy.semanticHash;
  const expected = canonicalLafeaSha256({
    schema: 'lafea-continuum-domain-first-preflight-hash-input/v1',
    evidence: copy,
  });
  if (value.semanticHash !== expected) fail('LAFEA_CONTINUUM_PREFLIGHT_TAMPERED');
  return freeze(structuredClone(value));
}

function validHighOrderJacobianPolicy(value) {
  return value
    && typeof value === 'object'
    && !Array.isArray(value)
    && JSON.stringify(Object.keys(value).sort())
      === JSON.stringify(Object.keys(HIGH_ORDER_JACOBIAN_POLICY).sort())
    && value.minimumDeterminant === HIGH_ORDER_JACOBIAN_POLICY.minimumDeterminant
    && value.maximumDepth === HIGH_ORDER_JACOBIAN_POLICY.maximumDepth
    && value.maximumSubregions === HIGH_ORDER_JACOBIAN_POLICY.maximumSubregions
    && value.authority === HIGH_ORDER_JACOBIAN_POLICY.authority;
}
function exact(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) {
    fail('LAFEA_CONTINUUM_PREFLIGHT_INVALID');
  }
}
function validCaseIds(value) {
  return Array.isArray(value) && value.length > 0
    && value.every((row) => typeof row === 'string' && row.trim())
    && new Set(value).size === value.length;
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
