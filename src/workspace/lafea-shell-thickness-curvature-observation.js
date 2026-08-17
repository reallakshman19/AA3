import {
  LAFEA_SHELL_SURFACE_KINDS,
  shellMidsurfaceKind,
} from './lafea-shell-midsurface-dispatch.js';
import { createLafea4ShellThicknessBasis } from './lafea-shell-thickness-basis.js';

export const LAFEA4_THICKNESS_CURVATURE_OBSERVATION_SCHEMA =
  'lafea4-thickness-curvature-observation/v1';
export const LAFEA4_CURVATURE_CEILING_ANGLE_DEGREES = 15;

const CURVED_KINDS = new Set([
  LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL,
  LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL_HOLES,
  LAFEA_SHELL_SURFACE_KINDS.CYLINDRICAL_PERIODIC,
]);

/**
 * Read-only engineering observation for LAFEA.4 curved-shell sizing.
 *
 * This is deliberately not a qualification gate. It binds the source element
 * thickness to the same source hash as the retained midsurface and reports the
 * sagitta/thickness consequence of the current target plus the qualified 15°
 * curvature ceiling. A regression locks this ceiling to the shell producer's
 * current source-controlled constant without importing the producer into the
 * presentation dependency graph.
 */
export function buildLafea4ThicknessCurvatureObservation(stage) {
  if (stage?.stageId !== 'LAFEA.4') return null;
  const parent = stage.retainedShellMidsurfaceEvidence ?? null;
  const meshProfile = stage.retainedAnalysisMeshProfile ?? null;
  const document = stage.document ?? null;
  const currentSourceHash = stage.sourceAuthority?.sourceHash
    ?? stage.lifecycle?.source?.sourceHash
    ?? null;
  if (!parent || !meshProfile || !document || !currentSourceHash) return null;
  if (parent.qualification !== 'PASS' || parent.sourceHash !== currentSourceHash) return null;

  const kind = shellMidsurfaceKind(parent);
  if (!CURVED_KINDS.has(kind)) return null;
  const radius = Number(parent.geometry?.surface?.radius);
  const requestedTargetElementLength = Number(meshProfile.fields?.globalTargetSize);
  if (!(Number.isFinite(radius) && radius > 0
    && Number.isFinite(requestedTargetElementLength) && requestedTargetElementLength > 0)) {
    return null;
  }

  const thicknessBasis = createLafea4ShellThicknessBasis({
    sourceHash: currentSourceHash,
    document,
  });
  const curvatureCeilingRadians = LAFEA4_CURVATURE_CEILING_ANGLE_DEGREES * Math.PI / 180;
  const curvatureTargetElementLength = radius * curvatureCeilingRadians;
  const effectiveTargetElementLength = Math.min(
    requestedTargetElementLength,
    curvatureTargetElementLength,
  );
  const effectiveCurvatureAngleRadians = Math.min(
    curvatureCeilingRadians,
    effectiveTargetElementLength / radius,
  );
  const effectiveCurvatureAngleDegrees = effectiveCurvatureAngleRadians * 180 / Math.PI;
  const curvatureSagitta = radius * (1 - Math.cos(effectiveCurvatureAngleRadians / 2));
  const uniformThickness = thicknessBasis.uniformThickness;
  const curvatureSagittaToThicknessRatio = uniformThickness === null
    ? null
    : curvatureSagitta / uniformThickness;

  return freeze({
    schema: LAFEA4_THICKNESS_CURVATURE_OBSERVATION_SCHEMA,
    stageId: 'LAFEA.4',
    authority: 'MEASURED_INFORMATIONAL_NOT_QUALIFICATION_GATE',
    sourceHash: currentSourceHash,
    meshProfileHash: meshProfile.semanticHash,
    analysisGeometryHash: parent.analysisGeometryHash,
    thicknessBasisHash: thicknessBasis.semanticHash,
    thicknessClassification: thicknessBasis.classification,
    minimumThickness: thicknessBasis.minimumThickness,
    maximumThickness: thicknessBasis.maximumThickness,
    uniformThickness,
    radius,
    requestedTargetElementLength,
    curvatureCeilingAngleDegrees: LAFEA4_CURVATURE_CEILING_ANGLE_DEGREES,
    curvatureTargetElementLength,
    effectiveTargetElementLength,
    effectiveCurvatureAngleDegrees,
    curvatureSagitta,
    curvatureSagittaToThicknessRatio,
    qualificationLimit: null,
    qualification: 'NOT_GATED',
  });
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
