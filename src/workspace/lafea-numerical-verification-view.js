/** Read-only presentation of retained convergence and mesh-quality evidence. */
import { element } from './lafea-workbench-dom.js';
import {
  buildLafeaT6GeometryQualificationViewModel,
  renderLafeaT6GeometryQualification,
} from './lafea-t6-geometry-qualification-view.js';
import {
  buildLafeaVerificationReleaseViewModel,
  renderLafeaVerificationRelease,
} from './lafea-verification-release-view.js';

export const LAFEA_NUMERICAL_VERIFICATION_VIEW_SCHEMA =
  'lafea-numerical-verification-view/v1';

export function buildLafeaNumericalVerificationViewModel(stageValue) {
  const stage = requireStage(stageValue);
  return freeze({
    schema: LAFEA_NUMERICAL_VERIFICATION_VIEW_SCHEMA,
    stageId: stage.stageId,
    preflight: preflightModel(stage.retainedContinuumPreflightEvidence),
    release: buildLafeaVerificationReleaseViewModel(stage),
    convergence: convergenceModel(stage.numericalVerificationProjection),
    meshQuality: meshQualityModel(stage),
    t6GeometryQualification: buildLafeaT6GeometryQualificationViewModel(stage),
  });
}

export function renderLafeaNumericalVerification(root, stageValue) {
  if (!root?.ownerDocument) {
    throw new TypeError('LAFEA_NUMERICAL_VERIFICATION_ROOT_REQUIRED');
  }
  const model = buildLafeaNumericalVerificationViewModel(stageValue);
  const wrapper = element(root, 'section', 'lafea-numerical-verification');
  wrapper.dataset.role = 'lafea-numerical-verification';
  wrapper.append(
    element(root, 'p', null,
      'Read-only numerical verification from retained governed evidence. Missing detail is reported as unavailable rather than reconstructed from display data.'),
    preflightSection(root, model.preflight),
    renderLafeaVerificationRelease(root, stageValue),
    convergenceSection(root, model.convergence),
    meshSection(root, model.meshQuality),
    renderLafeaT6GeometryQualification(root, stageValue),
  );
  return wrapper;
}

function preflightModel(evidence) {
  if (!evidence) {
    return freeze({
      status: 'ABSENT', rows: [],
      note: 'No current continuum solve-preflight evidence is retained. Global topology and full-parent high-order Jacobian proof are therefore not claimed here.',
    });
  }
  const policy = evidence.highOrderJacobianPolicy ?? null;
  return freeze({
    status: evidence.status ?? 'UNKNOWN',
    rows: [
      row('Preflight producer', evidence.producerRef),
      row('Global topology qualification hash', evidence.topologyQualificationHash),
      row('Full-parent Jacobian qualification hash', evidence.highOrderJacobianQualificationHash),
      row('Jacobian minimum determinant', policy?.minimumDeterminant),
      row('Jacobian proof maximum subdivision depth', policy?.maximumDepth),
      row('Jacobian proof maximum subregions', policy?.maximumSubregions),
      row('Jacobian proof policy authority', policy?.authority),
      row('Execution authorized by preflight', String(evidence.executionAuthorized === true)),
      row('Release qualified', String(evidence.releaseQualified === true)),
    ],
    note: 'Topology and full-parent T6/Q8 Jacobian checks are fail-closed execution blockers on the current retained mesh. Their proof-resource policy is source-controlled and cannot be relaxed from the UI; these checks do not by themselves grant mesh or release authority.',
  });
}

function convergenceModel(projection) {
  if (!projection || projection.bindingStatus === 'ABSENT') {
    return freeze({ status: 'ABSENT', custody: 'NONE', method: null, rows: [], reasons: [], note: 'No current convergence artifact is retained.' });
  }
  if (projection.bindingStatus === 'HASH_ONLY') {
    return freeze({
      status: 'HASH_ONLY', custody: 'LIFECYCLE_QUALIFIED_IDENTITY', method: 'LIFECYCLE_HASH_ONLY',
      rows: [row('Lifecycle convergence artifact', projection.lifecycleArtifactHash)],
      reasons: [...projection.reasons],
      note: 'Convergence is identified by current lifecycle evidence, but the detailed numerical envelope is not retained by this workbench.',
    });
  }
  if (projection.bindingStatus === 'STALE') {
    return freeze({
      status: 'STALE', custody: 'STALE_RETAINED_EVIDENCE', method: projection.method,
      rows: projection.lifecycleArtifactHash
        ? [row('Lifecycle convergence artifact', projection.lifecycleArtifactHash)] : [],
      reasons: [...projection.reasons],
      note: 'Detailed convergence evidence is retained for audit but is not current for this analysis.',
    });
  }
  const diagnostic = projection.bindingStatus === 'DIAGNOSTIC';
  const base = projection.method === 'BUCKET_01_GCI'
    ? gciModel(projection.evidence)
    : projection.method === 'CONTROLLED_CONTINUUM_RELATIVE_CHANGE'
      ? controlledModel(projection.evidence)
      : null;
  if (!base) return freeze({ status: 'STALE', custody: 'UNKNOWN', method: projection.method, rows: [], reasons: ['CONVERGENCE_METHOD_UNSUPPORTED'], note: 'Unsupported convergence evidence method.' });
  return freeze({
    ...base,
    custody: diagnostic ? 'SOURCE_BOUND_DIAGNOSTIC' : 'LIFECYCLE_QUALIFIED_DETAIL',
    reasons: unique([...projection.reasons, ...base.reasons]),
    note: diagnostic
      ? `Source-bound diagnostic only; this evidence is not a qualified lifecycle CONVERGENCE artifact. ${base.note}`
      : base.note,
  });
}

function gciModel(evidence) {
  const nearZero = evidence.reasons.includes('FINE_OBSERVATION_NEAR_ZERO_FOR_RELATIVE_GCI')
    || evidence.reasons.includes('MEDIUM_OBSERVATION_NEAR_ZERO_FOR_RELATIVE_GCI');
  return freeze({
    status: evidence.status,
    method: 'BUCKET_01_GCI_RICHARDSON',
    rows: [
      row('Quantity', evidence.quantityId),
      row('Sampling authority', evidence.samplingAuthority),
      row('Location', evidence.locationId),
      row('Mesh sizes (coarse / medium / fine)', joinNumbers(evidence.meshSizes)),
      row(`Observations (${evidence.units})`, joinNumbers(evidence.observations)),
      row('Refinement ratio', number(evidence.refinementRatio)),
      row('Convergence classification', evidence.classification),
      row('Observed order', nullableNumber(evidence.observedOrder)),
      row(`Richardson extrapolation (${evidence.units})`, nullableNumber(evidence.richardsonExtrapolation)),
      row('Fine-grid GCI', gciValue(evidence.fineGridGci, nearZero)),
      row('Coarse-grid GCI', gciValue(evidence.coarseGridGci, nearZero)),
      row('Fine-grid GCI tolerance', number(evidence.gciTolerance)),
      row('Asymptotic ratio', nullableNumber(evidence.asymptoticRatio)),
      row('Asymptotic range accepted', String(evidence.asymptoticRangeAccepted)),
    ],
    reasons: [...evidence.reasons],
    nearZeroRelativeGci: nearZero,
    note: nearZero
      ? 'Relative GCI is not applicable at the retained near-zero response scale; retained Richardson/order values remain shown where the producer computed them.'
      : 'GCI/Richardson values are displayed exactly from retained Bucket-01 convergence evidence.',
  });
}

function controlledModel(receipt) {
  const convergence = receipt.pilotConvergence;
  const levelRows = convergence.levels.map((level, index) => row(
    `Level ${level.ordinal} observation (${convergence.units})`,
    `${number(level.observedQuantity)}; relative change: ${index === 0 ? 'N/A' : nullableNumber(convergence.relativeChanges[index])}`,
  ));
  return freeze({
    status: convergence.status,
    method: 'GOVERNED_RELATIVE_CHANGE',
    rows: [
      row('Quantity', convergence.quantityId),
      row('Convergence tolerance', number(convergence.tolerance)),
      ...levelRows,
      row('Recovery-set hash', convergence.recoverySetHash),
      row('Convergence profile hash', convergence.convergenceProfileHash),
    ],
    reasons: [...convergence.reasons],
    nearZeroRelativeGci: false,
    note: 'This controlled-continuum contract evaluates governed relative changes across retained mesh levels; it does not claim Richardson extrapolation or GCI.',
  });
}

function meshQualityModel(stage) {
  const evidence = effectiveMeshEvidence(stage);
  const quality = evidence?.quality ?? null;
  if (!quality) return freeze({
    status: 'ABSENT', rows: [], warnings: [], blockers: [],
    extendedGeometryEvidenceAvailable: false,
    note: 'No retained general mesh-quality evidence is available.',
  });
  const rows = [
    row('Retained node count', evidence.mesh?.nodes?.length ?? 'Unknown'),
    row('Retained element count', quality.elementCount ?? evidence.mesh?.elements?.length ?? 'Unknown'),
    row('Overall mesh-quality status', quality.worstStatus ?? 'UNKNOWN'),
    ...quality.gateResults.map((gate) => row(
      gate.metric,
      `${number(gate.value)} — ${gate.status}; warning ${number(gate.warningThreshold)}, block ${number(gate.blockingThreshold)}`,
    )),
  ];
  return freeze({
    status: quality.worstStatus ?? 'UNKNOWN',
    rows,
    warnings: [...(quality.warningElementIds ?? [])],
    blockers: [...(quality.blockingElementIds ?? [])],
    extendedGeometryEvidenceAvailable:
      ['CURRENT_PASS', 'CURRENT_BLOCK'].includes(stage.t6GeometryQualificationProjection?.state),
    note: 'General mesh custody reports aspect-ratio/scaled-Jacobian quality only. The separate T6 geometry section below owns area, curved perimeter, boundary deviation, midside placement, topology and dense-Jacobian qualification when governed custody is current.',
  });
}

function preflightSection(root, model) {
  const section = element(root, 'section');
  section.append(element(root, 'h3', null, `Solve preflight proofs — ${model.status}`));
  if (model.rows.length) section.append(rows(root, model.rows));
  section.append(element(root, 'p', null, model.note));
  return section;
}

function convergenceSection(root, model) {
  const section = element(root, 'section');
  section.append(element(root, 'h3', null, `Convergence — ${model.status}`));
  if (model.custody) section.append(element(root, 'p', null, `Custody: ${model.custody}`));
  if (model.method) section.append(element(root, 'p', null, `Method: ${model.method}`));
  if (model.rows.length) section.append(rows(root, model.rows));
  section.append(element(root, 'p', null, model.note));
  if (model.reasons.length) section.append(reasonList(root, model.reasons));
  return section;
}

function meshSection(root, model) {
  const section = element(root, 'section');
  section.append(element(root, 'h3', null, `Retained mesh quality — ${model.status}`));
  if (model.rows.length) section.append(rows(root, model.rows));
  section.append(element(root, 'p', null, model.note));
  if (model.warnings.length) section.append(element(root, 'p', null, `Warning elements: ${model.warnings.join(', ')}`));
  if (model.blockers.length) section.append(element(root, 'p', null, `Blocking elements: ${model.blockers.join(', ')}`));
  return section;
}

function rows(root, values) {
  const list = element(root, 'dl', 'lafea-numerical-verification__rows');
  values.forEach((item) => list.append(
    element(root, 'dt', null, item.label),
    element(root, 'dd', null, String(item.value)),
  ));
  return list;
}
function reasonList(root, reasons) {
  const list = element(root, 'ul');
  reasons.forEach((value) => list.append(element(root, 'li', null, humanize(value))));
  return list;
}
function effectiveMeshEvidence(stage) {
  if (stage.analysisMeshCustodyProjection?.canView !== true) return null;
  return stage.domainFirstProfileActive === true || stage.shellMidsurfaceProfileActive === true
    ? stage.retainedAnalysisMeshEvidenceV2 ?? null
    : stage.retainedAnalysisMeshEvidence ?? null;
}
function row(label, value) { return freeze({ label, value: value ?? 'N/A' }); }
function number(value) { return typeof value === 'number' && Number.isFinite(value) ? Number(value.toPrecision(8)).toString() : 'N/A'; }
function nullableNumber(value) { return value === null || value === undefined ? 'N/A' : number(value); }
function joinNumbers(values) { return Array.isArray(values) ? values.map(number).join(' / ') : 'N/A'; }
function gciValue(value, nearZero) { return value === null && nearZero ? 'N/A — near-zero relative scale' : nullableNumber(value); }
function humanize(value) { return String(value).replace(/^LAFEA_/u, '').replaceAll('_', ' ').toLowerCase().replace(/^./u, (c) => c.toUpperCase()); }
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function requireStage(value) { if (!value || typeof value !== 'object' || typeof value.stageId !== 'string') throw new TypeError('LAFEA_NUMERICAL_VERIFICATION_STAGE_REQUIRED'); return value; }
function freeze(value) { if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value; Object.values(value).forEach(freeze); return Object.freeze(value); }
