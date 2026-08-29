/**
 * Pure ordinary LAFEA.3 intake composer.
 *
 * This boundary binds the current normalized engineering source to a declared,
 * mesh-independent analysis geometry and geometry-feature domain. It does not
 * generate nodes/elements, lower feature attachments to mesh entities, qualify
 * element Jacobians, execute the solver, or mutate workbench custody.
 */
import {
  createLafeaAnalysisGeometry,
  validateLafeaAnalysisGeometry,
} from './lafea-analysis-geometry-contract.js';
import {
  LAFEA_ANALYSIS_GEOMETRY_EVIDENCE_PROFILE,
  LAFEA_ANALYSIS_GEOMETRY_EVIDENCE_SCHEMA,
  createLafeaAnalysisGeometryEvidence,
} from './lafea-analysis-geometry-evidence.js';
import {
  LAFEA_CONTINUUM_ANALYSIS_DOMAIN_SCHEMA,
  createLafeaContinuumAnalysisDomain,
} from './lafea-continuum-analysis-domain.js';
import { requireLafeaStageComposition } from './lafea-stage-composition-root.js';
import { issueLafeaSourceAuthority } from './lafea-source-authority.js';

export const LAFEA_CONTINUUM_GEOMETRY_INTAKE_SCHEMA =
  'lafea-continuum-geometry-intake/v1';
export const LAFEA_CONTINUUM_GEOMETRY_INTAKE_PACKAGE_SCHEMA =
  'lafea-continuum-geometry-intake-package/v1';

const STAGE_ID = 'LAFEA.3';
const DECLARATION_KEYS = Object.freeze([
  'schema', 'geometry', 'applicationRef', 'regionId', 'materialRef',
  'attachments', 'producerRef', 'temperatureUnit',
]);

/**
 * Build a fully validated, custody-free intake package from the current stage
 * source plus an engineering geometry declaration.
 *
 * Physical case identities are derived from the current source and cannot be
 * re-authored here. Loads/restraints remain explicit geometry-feature
 * attachments and are later lowered to generated mesh entities by the existing
 * continuum solver compiler.
 */
export function createLafeaContinuumGeometryIntake(sourceDocument, declaration) {
  exact(declaration, DECLARATION_KEYS, 'LAFEA_CONTINUUM_GEOMETRY_INTAKE_KEYS_INVALID');
  if (declaration.schema !== LAFEA_CONTINUUM_GEOMETRY_INTAKE_SCHEMA) {
    fail('LAFEA_CONTINUUM_GEOMETRY_INTAKE_SCHEMA_INVALID');
  }

  const composition = requireLafeaStageComposition(STAGE_ID);
  if (!composition.executionSupported || typeof composition.canonicalize !== 'function') {
    fail('LAFEA_CONTINUUM_GEOMETRY_INTAKE_STAGE_NOT_EXECUTABLE');
  }
  const source = composition.normalizeDocument(sourceDocument);
  const canonical = composition.canonicalize(source);
  const producerRef = text(declaration.producerRef, 'PRODUCER_REF');
  const sourceAuthority = issueLafeaSourceAuthority(
    STAGE_ID,
    source,
    `${producerRef}/SOURCE`,
  );

  const geometry = canonicalGeometry(declaration.geometry);
  requireCurrentGeometryUnitBoundary(canonical, geometry);
  const materialRef = requireSingleRegionMaterial(canonical, declaration.materialRef);
  const uniformThickness = requireUniformThickness(canonical);
  const caseIds = canonical.loadCases.map((row) => row.loadCaseId).sort(compare);
  if (!caseIds.length) fail('LAFEA_CONTINUUM_GEOMETRY_INTAKE_PHYSICAL_CASE_REQUIRED');

  const analysisDomain = createLafeaContinuumAnalysisDomain({
    schema: LAFEA_CONTINUUM_ANALYSIS_DOMAIN_SCHEMA,
    stageId: STAGE_ID,
    sourceHash: sourceAuthority.sourceHash,
    applicationRef: text(declaration.applicationRef, 'APPLICATION_REF'),
    units: {
      length: canonical.units.declared.length,
      force: canonical.units.declared.force,
      stress: canonical.units.declared.stress,
      temperature: text(declaration.temperatureUnit, 'TEMPERATURE_UNIT'),
    },
    formulation: canonical.formulation,
    region: {
      regionId: text(declaration.regionId, 'REGION_ID'),
      materialRef,
    },
    physicalCases: caseIds.map((caseId) => ({ caseId })),
    attachments: cloneArray(declaration.attachments, 'ATTACHMENTS'),
  }, geometry);

  const geometryEvidence = createLafeaAnalysisGeometryEvidence({
    schema: LAFEA_ANALYSIS_GEOMETRY_EVIDENCE_SCHEMA,
    stageId: STAGE_ID,
    sourceHash: sourceAuthority.sourceHash,
    analysisDomain,
    geometry,
    producerRef,
    profileId: LAFEA_ANALYSIS_GEOMETRY_EVIDENCE_PROFILE,
  });

  return freeze({
    schema: LAFEA_CONTINUUM_GEOMETRY_INTAKE_PACKAGE_SCHEMA,
    stageId: STAGE_ID,
    sourceHash: sourceAuthority.sourceHash,
    sourceAuthority,
    canonicalSourceModelHash: canonical.semanticHash,
    sourceModelIdentity: canonical.modelIdentity,
    sourceModelVersion: canonical.modelVersion,
    materialRef,
    uniformThickness,
    physicalCaseIds: caseIds,
    analysisGeometry: geometry,
    analysisGeometryHash: geometry.semanticHash,
    analysisDomain,
    analysisDomainHash: analysisDomain.semanticHash,
    geometryEvidence,
    meshGenerated: false,
    solverExecuted: false,
    releaseQualified: false,
  });
}

function canonicalGeometry(value) {
  if (value?.semanticHash !== undefined) return validateLafeaAnalysisGeometry(value);
  return createLafeaAnalysisGeometry(value);
}

function requireCurrentGeometryUnitBoundary(canonical, geometry) {
  const declared = canonical.units?.declared?.length;
  const canonicalLength = canonical.units?.canonical?.length;
  if (geometry.lengthUnit !== declared) {
    fail('LAFEA_CONTINUUM_GEOMETRY_INTAKE_GEOMETRY_DECLARED_UNIT_MISMATCH');
  }
  if (geometry.lengthUnit !== canonicalLength) {
    // The current downstream solver compiler explicitly supports only geometry
    // already expressed in canonical length units. Fail here rather than
    // implying the intake performs geometry conversion.
    fail('LAFEA_CONTINUUM_GEOMETRY_INTAKE_NONCANONICAL_GEOMETRY_UNSUPPORTED');
  }
}

function requireSingleRegionMaterial(canonical, requestedMaterialRef) {
  const requested = text(requestedMaterialRef, 'MATERIAL_REF');
  const elementMaterialIds = [...new Set(canonical.elements.map((row) => row.materialId))];
  if (elementMaterialIds.length !== 1) {
    fail('LAFEA_CONTINUUM_GEOMETRY_INTAKE_SINGLE_REGION_MATERIAL_REQUIRED');
  }
  if (elementMaterialIds[0] !== requested
    || !canonical.materials.some((row) => row.materialId === requested)) {
    fail('LAFEA_CONTINUUM_GEOMETRY_INTAKE_MATERIAL_BINDING_INVALID');
  }
  return requested;
}

function requireUniformThickness(canonical) {
  const values = [...new Set(canonical.elements.map((row) => row.thickness))];
  if (values.length !== 1 || !(values[0] > 0) || !Number.isFinite(values[0])) {
    fail('LAFEA_CONTINUUM_GEOMETRY_INTAKE_UNIFORM_THICKNESS_REQUIRED');
  }
  return values[0];
}

function cloneArray(value, field) {
  if (!Array.isArray(value)) fail(`LAFEA_CONTINUUM_GEOMETRY_INTAKE_${field}_INVALID`);
  return structuredClone(value);
}
function exact(value, keys, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) {
    fail(code);
  }
}
function text(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    fail(`LAFEA_CONTINUUM_GEOMETRY_INTAKE_${field}_INVALID`);
  }
  return value.trim();
}
function compare(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
