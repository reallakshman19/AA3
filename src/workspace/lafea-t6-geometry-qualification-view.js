/** Read-only view model for governed Bucket-01 T6 geometry qualification. */
import { element } from './lafea-workbench-dom.js';

export const LAFEA_T6_GEOMETRY_QUALIFICATION_VIEW_SCHEMA =
  'lafea-t6-geometry-qualification-view/v1';

export function buildLafeaT6GeometryQualificationViewModel(stageValue) {
  const stage = requireStage(stageValue);
  const projection = stage.t6GeometryQualificationProjection ?? null;
  if (!projection || projection.state === 'ABSENT') {
    return freeze({
      schema: LAFEA_T6_GEOMETRY_QUALIFICATION_VIEW_SCHEMA,
      stageId: stage.stageId,
      status: 'ABSENT',
      custody: 'NONE',
      rows: [],
      reasons: [],
      note: 'No governed T6 geometry-qualification custody is retained for this stage.',
    });
  }

  if (projection.state === 'STALE' || projection.state === 'INVALID') {
    return freeze({
      schema: LAFEA_T6_GEOMETRY_QUALIFICATION_VIEW_SCHEMA,
      stageId: stage.stageId,
      status: projection.state,
      custody: projection.state === 'STALE'
        ? 'STALE_RETAINED_EVIDENCE' : 'INVALID_RETAINED_EVIDENCE',
      rows: identityRows(projection),
      reasons: [...projection.reasons],
      note: projection.state === 'STALE'
        ? 'T6 qualification evidence is retained for audit but no longer matches the current build and analysis-mesh custody. Numerical qualification values are not presented as current.'
        : 'Retained T6 qualification custody failed its rebuild contract. Numerical qualification values are not presented.',
    });
  }

  const retained = stage.retainedT6GeometryQualification ?? null;
  if (!retained?.evidence
    || retained.evidenceSemanticHash !== projection.evidenceSemanticHash) {
    return freeze({
      schema: LAFEA_T6_GEOMETRY_QUALIFICATION_VIEW_SCHEMA,
      stageId: stage.stageId,
      status: 'INVALID',
      custody: 'DETAIL_NOT_RETAINED',
      rows: identityRows(projection),
      reasons: ['LAFEA_T6_GEOMETRY_DETAIL_NOT_RETAINED'],
      note: 'The current projection identity exists but the exact retained qualification envelope is unavailable.',
    });
  }

  const evidence = retained.evidence;
  return freeze({
    schema: LAFEA_T6_GEOMETRY_QUALIFICATION_VIEW_SCHEMA,
    stageId: stage.stageId,
    status: projection.state,
    custody: projection.state === 'CURRENT_PASS'
      ? 'CURRENT_QUALIFIED_DETAIL' : 'CURRENT_BLOCKED_DETAIL',
    rows: [
      ...identityRows(projection),
      ...geometryRows(evidence.geometry),
      ...topologyRows(evidence.topology),
      ...validityRows(evidence.validity),
      ...toleranceRows(evidence.tolerances),
    ],
    reasons: [...projection.reasons],
    note: projection.state === 'CURRENT_PASS'
      ? 'Exact-head T6 geometry qualification is current for the retained analysis mesh. This qualification does not establish material, load, restraint, solver, code-assessment, or release authority.'
      : 'The exact T6 qualification envelope is current for the retained analysis mesh but the producer classified it BLOCKED. Values are shown as governed diagnostic evidence, not as qualification success.',
  });
}

export function renderLafeaT6GeometryQualification(root, stageValue) {
  const model = buildLafeaT6GeometryQualificationViewModel(stageValue);
  const section = element(root, 'section', 'lafea-t6-geometry-qualification');
  section.dataset.role = 'lafea-t6-geometry-qualification';
  section.append(
    element(root, 'h3', null, `T6 geometry qualification — ${model.status}`),
    element(root, 'p', null, `Custody: ${model.custody}`),
  );
  if (model.rows.length) section.append(rows(root, model.rows));
  section.append(element(root, 'p', null, model.note));
  if (model.reasons.length) section.append(reasonList(root, model.reasons));
  return section;
}

function identityRows(projection) {
  return [
    row('Mesh identity', projection.meshIdentity),
    row('Exact candidate head', projection.exactHeadSha),
    row('Canonical analysis-mesh hash', projection.analysisMeshHash),
    row('Canonical parent-package digest', projection.parentMeshPackageDigest),
    row('Producer-declared mesh-package hash', projection.declaredMeshPackageHash),
    row('Qualification profile hash', projection.qualificationProfileHash),
    row('Qualification evidence hash', projection.evidenceSemanticHash),
    row('Ordinary mesh-custody state', projection.meshCustodyState),
  ];
}

function geometryRows(value) {
  if (!value) return [];
  return [
    row('Reference length', number(value.referenceLength)),
    row('Integrated T6 area', number(value.integratedArea)),
    row('Analytical area', number(value.analyticalArea)),
    row('Area relative error', number(value.areaRelativeError)),
    row('Hole-boundary maximum radius error', number(value.holeBoundaryMaximumRadiusError)),
    row('Outer-boundary maximum radius error', number(value.outerBoundaryMaximumRadiusError)),
    row('Maximum boundary deviation', number(value.maximumBoundaryDeviation)),
    row('Hole-center error', number(value.holeCenterError)),
    row('Critical ligament minimum', number(value.criticalLigamentMinimum)),
    row('Critical ligament maximum', number(value.criticalLigamentMaximum)),
    row('Analytical critical ligament', number(value.analyticalCriticalLigament)),
    row('Critical ligament relative error', number(value.criticalLigamentRelativeError)),
    row('Hole curved-edge perimeter', number(value.holePerimeter)),
    row('Outer curved-edge perimeter', number(value.outerPerimeter)),
    row('Integrated total perimeter', number(value.integratedPerimeter)),
    row('Analytical total perimeter', number(value.analyticalPerimeter)),
    row('Total perimeter relative error', number(value.totalPerimeterRelativeError)),
    row('Maximum midside-placement error', number(value.maximumMidsidePlacementError)),
    row('Rotational-symmetry error', number(value.rotationalSymmetryError)),
  ];
}

function topologyRows(value) {
  if (!value) return [];
  return [
    row('Topology node count', value.nodeCount),
    row('Topology element count', value.elementCount),
    row('Unique edge count', value.uniqueEdgeCount),
    row('Boundary edge count', value.boundaryEdgeCount),
    row('Connected component count', value.connectedComponentCount),
    row('Shared-edge midside identity accepted', String(value.sharedEdgeIdentityAccepted)),
    row('Feature sets complete', String(value.featureSetsComplete)),
    row('Topology errors', list(value.errors)),
  ];
}

function validityRows(value) {
  if (!value) return [];
  return [
    row('Dense Jacobian sample divisions', value.jacobianSampleDivisions),
    row('Minimum dense Jacobian determinant', number(value.minimumDenseJacobian)),
    row('Non-positive dense Jacobian count', value.nonPositiveDenseJacobianCount),
    row('Duplicate-node distance tolerance', number(value.duplicateNodeDistance)),
    row('Duplicate-node pair count', value.duplicateNodePairCount),
    row('Duplicate-node pairs', pairList(value.duplicateNodePairs)),
    row('Validity errors', list(value.errors)),
  ];
}

function toleranceRows(value) {
  if (!value) return [];
  return Object.entries(value).map(([key, tolerance]) =>
    row(`Tolerance — ${humanize(key)}`, number(tolerance)));
}

function rows(root, values) {
  const listElement = element(root, 'dl', 'lafea-numerical-verification__rows');
  values.forEach((item) => listElement.append(
    element(root, 'dt', null, item.label),
    element(root, 'dd', null, String(item.value)),
  ));
  return listElement;
}
function reasonList(root, reasons) {
  const listElement = element(root, 'ul');
  reasons.forEach((value) => listElement.append(element(root, 'li', null, humanize(value))));
  return listElement;
}
function pairList(value) {
  if (!Array.isArray(value) || !value.length) return 'None';
  return value.map((pair) => Array.isArray(pair) ? pair.join(' ↔ ') : String(pair)).join(' • ');
}
function list(value) { return Array.isArray(value) && value.length ? value.join(' • ') : 'None'; }
function row(label, value) { return freeze({ label, value: value ?? 'N/A' }); }
function number(value) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Number(value.toPrecision(8)).toString() : 'N/A';
}
function humanize(value) {
  return String(value).replace(/^LAFEA_/u, '').replaceAll('_', ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
    .replace(/^./u, (character) => character.toUpperCase());
}
function requireStage(value) {
  if (!value || typeof value !== 'object' || typeof value.stageId !== 'string') {
    throw new TypeError('LAFEA_T6_GEOMETRY_VIEW_STAGE_REQUIRED');
  }
  return value;
}
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
