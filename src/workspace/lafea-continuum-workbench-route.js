/** Exact workbench context for the governed LAFEA.3 domain-first solver route. */
import { compileLafeaContinuumSolverModel } from './lafea-continuum-solver-model.js';
import { requireLafeaStageComposition } from './lafea-stage-composition-root.js';
import { issueLafeaSourceAuthority } from './lafea-source-authority.js';

const STAGE_ID = 'LAFEA.3';

export function compileLafeaContinuumWorkbenchContext(context, stageId) {
  const c = requireContext(context);
  if (stageId !== STAGE_ID) fail('LAFEA_CONTINUUM_SOLVER_STAGE_NOT_AUTHORIZED');
  const stage = c.readStageState(stageId);
  requireCompilerReadiness(stage);
  const composition = requireLafeaStageComposition(stageId);
  if (!composition.executionSupported || typeof composition.canonicalize !== 'function') {
    fail('LAFEA_CONTINUUM_SOLVER_CANONICALIZER_NOT_AVAILABLE');
  }
  const source = composition.normalizeDocument(c.retained.exportDocument());
  const sourceAuthority = issueLafeaSourceAuthority(
    stageId, source, 'COMPILE_SOLVER_MODEL/SOURCE_AUTHORITY',
  );
  if (stage.lifecycle?.source?.sourceHash !== sourceAuthority.sourceHash) {
    fail('LAFEA_CONTINUUM_SOLVER_SOURCE_PARENT_STALE');
  }
  const canonicalInput = composition.canonicalize(source);
  const analysisDomain = c.geometry.selectDomain(stageId);
  const geometryEvidence = c.geometry.selectGeometryEvidence(stageId);
  const meshEvidence = c.meshGeneration.selectEvidence(stageId);
  const solverModel = compileLafeaContinuumSolverModel({
    sourceAuthority,
    source,
    canonicalInput,
    analysisDomain,
    geometryEvidence,
    meshEvidence,
  });
  return freeze({
    stageId,
    sourceAuthority,
    source,
    canonicalInput,
    analysisDomain,
    geometryEvidence,
    meshEvidence,
    solverModel,
  });
}

export function requireLafeaContinuumCompilerReadiness(stage) {
  requireCompilerReadiness(stage);
  return true;
}

function requireCompilerReadiness(stage) {
  if (stage?.domainFirstProfileActive !== true || stage?.shellMidsurfaceProfileActive === true) {
    fail('LAFEA_CONTINUUM_SOLVER_DOMAIN_FIRST_PROFILE_REQUIRED');
  }
  if (stage.lifecycleBinding?.status !== 'CURRENT') {
    fail('LAFEA_CONTINUUM_SOLVER_SOURCE_BINDING_NOT_CURRENT');
  }
  if (stage.analysisDomainProjection?.state !== 'CURRENT_PASS') {
    fail('LAFEA_CONTINUUM_SOLVER_ANALYSIS_DOMAIN_NOT_CURRENT');
  }
  if (stage.analysisGeometryProjection?.state !== 'CURRENT_PASS') {
    fail('LAFEA_CONTINUUM_SOLVER_ANALYSIS_GEOMETRY_NOT_CURRENT');
  }
  if (stage.analysisMeshCustodyProjection?.state !== 'CURRENT_PASS'
    || stage.analysisMeshCustodyProjection?.usableForRun !== true) {
    fail('LAFEA_CONTINUUM_SOLVER_ANALYSIS_MESH_NOT_CURRENT_PASS');
  }
}

function requireContext(value) {
  if (!value || typeof value !== 'object'
    || !value.retained || !value.geometry || !value.meshGeneration
    || typeof value.readStageState !== 'function') {
    throw new TypeError('LAFEA_CONTINUUM_WORKBENCH_CONTEXT_INVALID');
  }
  return value;
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
