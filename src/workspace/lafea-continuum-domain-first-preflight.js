/** Non-solving Stage 13 preflight for authoritative LAFEA.3 domain-first execution. */
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';
import { compileLafeaContinuumWorkbenchContext } from './lafea-continuum-workbench-route.js';

export const LAFEA_CONTINUUM_DOMAIN_FIRST_PREFLIGHT_SCHEMA =
  'lafea-continuum-domain-first-preflight/v1';
export const LAFEA_CONTINUUM_DOMAIN_FIRST_PREFLIGHT_PRODUCER =
  'STAGE13/LAFEA.3/DOMAIN_FIRST_COMPILED_PREFLIGHT/13.1';

const STAGE_ID = 'LAFEA.3';
const CAPABILITIES = Object.freeze([
  'SOURCE', 'SCHEMA', 'UNIT', 'GEOMETRY', 'TOPOLOGY', 'MATERIAL', 'SECTION',
  'RESTRAINT', 'LOAD', 'PHYSICAL_CASE', 'CONSTRAINT', 'MESH_CUSTODY',
  'SOLVER_MODEL_COMPILATION',
]);

export function createLafeaContinuumDomainFirstPreflight(context, stageId = STAGE_ID) {
  if (stageId !== STAGE_ID) fail('LAFEA_CONTINUUM_PREFLIGHT_STAGE_NOT_AUTHORIZED');
  const compiled = compileLafeaContinuumWorkbenchContext(context, stageId);
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
  if (!value || value.schema !== LAFEA_CONTINUUM_DOMAIN_FIRST_PREFLIGHT_SCHEMA
    || value.stageId !== STAGE_ID
    || value.producerRef !== LAFEA_CONTINUUM_DOMAIN_FIRST_PREFLIGHT_PRODUCER
    || value.status !== 'PASS' || value.solverExecuted !== false
    || value.executionAuthorized !== true || value.releaseQualified !== false
    || !Array.isArray(value.findings) || value.findings.length !== 0
    || !Array.isArray(value.capabilityIds)
    || CAPABILITIES.some((id) => !value.capabilityIds.includes(id))) {
    fail('LAFEA_CONTINUUM_PREFLIGHT_INVALID');
  }
  for (const key of [
    'sourceHash', 'analysisDomainHash', 'analysisGeometryHash', 'meshHash',
    'solverModelHash', 'semanticHash',
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

function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
