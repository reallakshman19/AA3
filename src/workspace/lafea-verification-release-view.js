import { element } from './lafea-workbench-dom.js';

export const LAFEA_VERIFICATION_RELEASE_VIEW_SCHEMA =
  'lafea-verification-release-view/v1';

export function buildLafeaVerificationReleaseViewModel(stageValue) {
  const stage = requireStage(stageValue);
  const execution = stage.execution ?? null;
  const transaction = execution?.runTransactionReceipt ?? null;
  const solver = execution?.runtimeSolverDiagnostics ?? null;
  const mesh = stage.analysisMeshCustodyProjection ?? null;
  const recovery = stage.lifecycle?.artifacts?.RECOVERY ?? null;
  const b02 = stage.b02ProductionQualificationEvidence ?? null;
  const blockers = [];
  if (execution?.status !== 'QUALIFIED') blockers.push('AUTHORITATIVE_EXECUTION_NOT_QUALIFIED');
  if (transaction?.status !== 'COMPLETED') blockers.push('IMMUTABLE_RUN_TRANSACTION_NOT_COMPLETED');
  if (solver?.terminationState !== 'CONVERGED') blockers.push('SOLVER_TERMINATION_NOT_RETAINED_AS_CONVERGED');
  if (mesh?.state !== 'CURRENT_PASS') blockers.push('CURRENT_PASS_MESH_CUSTODY_REQUIRED');
  if (recovery?.status !== 'CURRENT' || recovery?.qualification !== 'PASS') {
    blockers.push('CURRENT_PASS_RECOVERY_CUSTODY_REQUIRED');
  }
  if (b02?.status !== 'PASS' || b02?.caseId !== 'B02E' || b02?.b02Qualified !== true) {
    blockers.push('B02_EXACT_HEAD_PRODUCTION_QUALIFICATION_NOT_RETAINED_IN_SESSION');
  }
  if (execution?.releaseQualified !== true) blockers.push('RELEASE_AUTHORITY_NOT_GRANTED');
  return freeze({
    schema: LAFEA_VERIFICATION_RELEASE_VIEW_SCHEMA,
    stageId: stage.stageId,
    status: blockers.length ? 'BLOCKED' : 'RELEASE_QUALIFIED',
    blockers: unique(blockers),
    rows: [
      row('Calculation state', execution?.status ?? 'ABSENT'),
      row('Run transaction', transaction?.status ?? 'ABSENT'),
      row('Execution hash', execution?.compiledExecutionHash),
      row('Canonical execution-input hash', execution?.canonicalExecutionInputHash),
      row('Solver termination', solver?.terminationState ?? 'ABSENT'),
      row('Solver storage route', solver?.storageRoute),
      row('Solver methods', solver?.methods?.join(', ')),
      row('Mesh custody', mesh?.state ?? 'ABSENT'),
      row('Mesh hash', mesh?.meshHash),
      row('Recovery custody', recovery ? `${recovery.status}/${recovery.qualification}` : 'ABSENT'),
      row('Recovery artifact hash', recovery?.artifactHash),
      row('B02 production qualification', b02?.status ?? 'NOT_RETAINED_IN_SESSION'),
      row('B02 qualification hash', b02?.semanticHash),
      row('Release qualified', String(execution?.releaseQualified === true)),
    ],
    b02Definitions: Object.freeze([
      'B02A — exact plane-stress bending',
      'B02B — Saint-Venant shear/flexure',
      'B02C — Kirsch circular-hole field',
      'B02D — probe-stable lug/pinhole response',
      'B02E — frozen quantity-bound convergence',
    ]),
    note: 'This panel is evidence-driven and read-only. B02 targets, physical probes, mesh ladders and acceptance limits are source-controlled frozen qualification definitions, not user-tunable settings. Exact-head CI evidence is never inferred from an interactive solve. Release remains blocked until an explicit retained production-qualification/release artifact is current.',
  });
}

export function renderLafeaVerificationRelease(root, stageValue) {
  if (!root?.ownerDocument) throw new TypeError('LAFEA_VERIFICATION_RELEASE_ROOT_REQUIRED');
  const model = buildLafeaVerificationReleaseViewModel(stageValue);
  const section = element(root, 'section', 'lafea-verification-release');
  section.dataset.role = 'lafea-verification-release';
  section.dataset.status = model.status;
  section.append(
    element(root, 'h3', null, `Verification & Release — ${model.status}`),
    descriptionRows(root, model.rows),
    element(root, 'p', null, model.note),
  );
  const definitions = element(root, 'details', 'lafea-verification-release__definitions');
  const summary = element(root, 'summary');
  summary.textContent = 'Frozen B02 qualification programme';
  definitions.append(summary);
  const list = element(root, 'ul');
  model.b02Definitions.forEach((value) => list.append(element(root, 'li', null, value)));
  definitions.append(list);
  section.append(definitions);
  if (model.blockers.length) {
    const blockers = element(root, 'ul', 'lafea-verification-release__blockers');
    blockers.dataset.role = 'lafea-verification-release-blockers';
    model.blockers.forEach((value) => blockers.append(element(root, 'li', null, humanize(value))));
    section.append(blockers);
  }
  return section;
}

function descriptionRows(root, values) {
  const list = element(root, 'dl', 'lafea-verification-release__rows');
  values.forEach((item) => list.append(
    element(root, 'dt', null, item.label),
    element(root, 'dd', null, String(item.value ?? 'N/A')),
  ));
  return list;
}
function row(label, value) { return Object.freeze({ label, value: value ?? 'N/A' }); }
function humanize(value) {
  return String(value).replace(/^LAFEA_/u, '').replaceAll('_', ' ').toLowerCase()
    .replace(/^./u, (character) => character.toUpperCase());
}
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function requireStage(value) {
  if (!value || typeof value !== 'object' || typeof value.stageId !== 'string') {
    throw new TypeError('LAFEA_VERIFICATION_RELEASE_STAGE_REQUIRED');
  }
  return value;
}
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
