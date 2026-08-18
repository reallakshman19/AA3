import {
  canonicalProfile,
  defaultProfileFields,
  PROFILE_KINDS,
} from '/src/core/lafea-profile-contract/index.js';
import {
  LAFEA_ANALYSIS_GEOMETRY_EVIDENCE_PROFILE,
  LAFEA_ANALYSIS_GEOMETRY_EVIDENCE_SCHEMA,
  createLafeaAnalysisGeometryEvidence,
} from '/src/workspace/lafea-analysis-geometry-evidence.js';
import {
  LAFEA_ANALYSIS_GEOMETRY_ORIENTATION_POLICY,
  LAFEA_ANALYSIS_GEOMETRY_SCHEMA,
  createLafeaAnalysisGeometry,
} from '/src/workspace/lafea-analysis-geometry-contract.js';
import {
  LAFEA_CONTINUUM_ANALYSIS_DOMAIN_SCHEMA,
  createLafeaContinuumAnalysisDomain,
} from '/src/workspace/lafea-continuum-analysis-domain.js';
import { canonicalLafeaSha256 } from '/src/workspace/lafea-canonical-sha256.js';
import { evaluateLafeaBucket01Convergence, LAFEA_BUCKET_01_CONVERGENCE_INPUT_SCHEMA } from '/src/workspace/lafea-bucket-01-convergence.js';
import { LAFEA_WORKBENCH_VERIFICATION_INTAKE_SCHEMA } from '/src/workspace/lafea-workbench-verification-state.js';
import { LafeaStandaloneController } from '/src/lafea-app/standalone-controller.js';
import { requireLafeaStageComposition } from '/src/workspace/lafea-stage-composition-root.js';
import { issueLafeaSourceAuthority } from '/src/workspace/lafea-source-authority.js';
import { triangleSource } from '/scripts/lafea.3-fixtures.mjs';

export function mountQualifiedLafea3(root, options = {}) {
  const buildSha = options.buildSha ?? 'a'.repeat(40);
  const composition = requireLafeaStageComposition('LAFEA.3');
  const source = composition.normalizeDocument(triangleSource());
  const authority = issueLafeaSourceAuthority('LAFEA.3', source, 'A17/BROWSER-GOLDEN');
  const geometry = triangleGeometry();
  const domain = sourceEquivalentDomain(authority.sourceHash, geometry, {
    unstable: options.unstable === true,
    includeTemperature: options.includeTemperature === true,
  });
  const geometryEvidence = createLafeaAnalysisGeometryEvidence({
    schema: LAFEA_ANALYSIS_GEOMETRY_EVIDENCE_SCHEMA,
    stageId: 'LAFEA.3', sourceHash: authority.sourceHash,
    analysisDomain: domain, geometry,
    producerRef: 'A17/BROWSER-GOLDEN-GEOMETRY',
    profileId: LAFEA_ANALYSIS_GEOMETRY_EVIDENCE_PROFILE,
  });
  const controller = new LafeaStandaloneController(root, {
    initialStage: 'LAFEA.3', initialDocument: source,
    initialSourceHash: authority.sourceHash, currentCandidateHeadSha: buildSha,
  }).init();
  controller.store.activateDomainFirstProfile();
  controller.store.registerAnalysisDomain(domain);
  controller.store.registerAnalysisGeometryEvidence(geometryEvidence);
  controller.bindAnalysisMeshProfile(meshProfile(options.targetElementLength ?? 25));
  const generated = controller.generateAnalysisMesh();
  if (generated?.evidence?.qualification !== 'PASS') throw new Error('A17_INITIAL_MESH_NOT_QUALIFIED');
  return { controller, source, authority, geometry, domain, buildSha };
}

export function authorizeAndRun(controller) {
  const preflight = controller.store.prepareContinuumForRun();
  if (preflight.projection?.state !== 'CURRENT_PASS') throw new Error('A17_PREFLIGHT_NOT_CURRENT_PASS');
  return controller.run();
}

export function refineAndRun(controller, targetElementLength) {
  const parent = controller.selectRetainedAnalysisMeshEvidenceV2();
  const targetId = parent?.mesh?.elements?.[0]?.elementId;
  if (!targetId) throw new Error('A17_REFINEMENT_TARGET_REQUIRED');
  controller.refineAnalysisMesh({
    commandId: `A17-REFINE-${String(targetElementLength).replace('.', '_')}`,
    targetType: 'ELEMENT', targetIds: [targetId],
    targetElementLength, lengthUnit: 'mm',
    reason: 'A17 browser golden governed refinement',
  });
  return authorizeAndRun(controller);
}

export function evaluateHistoryEnergyConvergence(controller, runIds, meshSizes) {
  const entries = runIds.map((runId) => controller.getRunHistoryEntry(runId));
  const observations = entries.map((entry) => {
    const row = entry.evidence.execution.quantities.find((quantity) =>
      quantity.loadCaseId === 'L1' && quantity.quantityId === 'TOTAL_STRAIN_ENERGY');
    if (!row) throw new Error('A17_HISTORY_ENERGY_QUANTITY_REQUIRED');
    return row.value;
  });
  return evaluateLafeaBucket01Convergence({
    schema: LAFEA_BUCKET_01_CONVERGENCE_INPUT_SCHEMA,
    quantityId: 'TOTAL_STRAIN_ENERGY',
    samplingAuthority: 'FIXED_GLOBAL_RESPONSE',
    locationId: 'L1_TOTAL_STRAIN_ENERGY', locationDefinitionHash: canonicalLafeaSha256({
      schema: 'a17-global-response-location/v1', loadCaseId: 'L1', quantityId: 'TOTAL_STRAIN_ENERGY',
    }),
    units: 'N*mm', meshSizes, observations,
    gciTolerance: 0.05, minimumObservedOrder: null,
    asymptoticRatioBounds: { minimum: 0.5, maximum: 2 },
  });
}

export function retainVerificationDiagnostic(controller, evidence) {
  const stage = controller.getState().stages['LAFEA.3'];
  if (evidence.status !== 'BLOCKED') return null;
  return controller.registerNumericalVerificationEvidence({
    schema: LAFEA_WORKBENCH_VERIFICATION_INTAKE_SCHEMA,
    stageId: 'LAFEA.3',
    sourceHash: stage.sourceAuthority.sourceHash,
    documentRevisionDigest: stage.lifecycleBinding.currentDocumentDigest,
    evidence,
  });
}

export function changeSourceMaterial(controller) {
  const document = structuredClone(controller.getState().stages['LAFEA.3'].document);
  document.materials[0].elasticModulus *= 1.01;
  return controller.applyDocumentText(JSON.stringify(document));
}

export function meshProfile(globalTargetSize) {
  const defaults = defaultProfileFields(PROFILE_KINDS.MESH);
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1', profileIdentity: `A17-T6-${globalTargetSize}`,
    sourceRevision: 'A17.2', semanticHash: undefined,
    fields: {
      ...defaults,
      continuumElement: 'T6',
      shellElement: 'CST_DKT_TRI3_THIN_SHELL_V1',
      globalTargetSize,
    },
  });
}

function sourceEquivalentDomain(sourceHash, geometry, options = {}) {
  const unstable = options.unstable === true;
  const includeTemperature = options.includeTemperature === true;
  const allCases = ['L1', 'L2'];
  const attachments = [
    attachment('FIX-A', 'RESTRAINT', 'VERTEX', 'A', allCases, { ux: true, uy: true }),
    ...(unstable ? [] : [attachment('FIX-B-Y', 'RESTRAINT', 'VERTEX', 'B', allCases, { uy: true })]),
    attachment('F1', 'CONCENTRATED_LOAD', 'VERTEX', 'B', ['L1'], { fx: 1000, fy: 0, unit: 'N' }),
    attachment('F2', 'CONCENTRATED_LOAD', 'VERTEX', 'B', ['L2'], { fx: -500, fy: 0, unit: 'N' }),
  ];
  if (includeTemperature) {
    attachments.push(
      attachment('TEMP', 'TEMPERATURE', 'REGION', 'REGION-1', ['L1'], { value: 50, unit: 'C' }),
    );
  }
  return createLafeaContinuumAnalysisDomain({
    schema: LAFEA_CONTINUUM_ANALYSIS_DOMAIN_SCHEMA,
    stageId: 'LAFEA.3', sourceHash,
    applicationRef: includeTemperature
      ? 'A17/TEMPERATURE-PREFLIGHT-VETO'
      : unstable
        ? 'A17/UNSTABLE-DOMAIN'
        : 'A17/GOLDEN-DOMAIN',
    units: { length: 'mm', force: 'N', stress: 'MPa', temperature: 'C' },
    formulation: 'PLANE_STRESS',
    region: { regionId: 'REGION-1', materialRef: 'MAT' },
    physicalCases: allCases.map((caseId) => ({ caseId })),
    attachments,
  }, geometry);
}
function triangleGeometry() {
  return createLafeaAnalysisGeometry({
    schema: LAFEA_ANALYSIS_GEOMETRY_SCHEMA,
    stageId: 'LAFEA.3', geometryId: 'A17-TRIANGLE-DOMAIN', coordinateSystemId: 'GLOBAL_XY',
    lengthUnit: 'mm', orientationPolicy: LAFEA_ANALYSIS_GEOMETRY_ORIENTATION_POLICY,
    vertices: [
      { vertexId: 'A', x: 0, y: 0 }, { vertexId: 'B', x: 100, y: 0 },
      { vertexId: 'C', x: 0, y: 100 },
    ],
    segments: [line('S1', 'A', 'B'), line('S2', 'B', 'C'), line('S3', 'C', 'A')],
    loops: [{ loopId: 'OUTER', role: 'OUTER', segmentIds: ['S1', 'S2', 'S3'] }],
  });
}
function attachment(attachmentId, kind, targetType, targetId, physicalCaseIds, payload) {
  return { attachmentId, kind, targetType, targetId, physicalCaseIds, payload };
}
function line(segmentId, startVertexId, endVertexId) {
  return { segmentId, type: 'LINE', startVertexId, endVertexId };
}