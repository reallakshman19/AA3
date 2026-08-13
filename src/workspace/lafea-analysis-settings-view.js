/** Read-only projection of analysis and solver settings already retained by the active stage. */
import { element } from './lafea-workbench-dom.js';
import { requireLafeaStageRegistryEntry } from './lafea-stage-registry.js';

export const LAFEA_ANALYSIS_SETTINGS_VIEW_SCHEMA = 'lafea-analysis-settings-view/v1';

export function buildLafeaAnalysisSettingsViewModel(stageValue) {
  const stage = requireStage(stageValue);
  const documentValue = stage.document ?? null;
  const profile = documentValue?.qualificationProfile ?? null;
  const requests = documentValue?.resultRequests ?? null;
  const registry = requireLafeaStageRegistryEntry(stage.stageId);
  return freeze({
    schema: LAFEA_ANALYSIS_SETTINGS_VIEW_SCHEMA,
    stageId: stage.stageId,
    readOnly: true,
    modelRows: [
      row('Model identity', textOr(documentValue?.modelIdentity)),
      row('Model version', textOr(documentValue?.modelVersion)),
      row('Formulation', textOr(documentValue?.formulation)),
      row('Thickness policy', textOr(documentValue?.thicknessBasis?.policy)),
      row('Requested analyses / cases', requestSummary(requests)),
      row('Unit basis', unitSummary(documentValue?.units)),
      row('Code / allowable basis', codeBasisSummary(documentValue)),
    ],
    solverRows: [
      row('Registered engine', registry.enginePackage ? `src/core/${registry.enginePackage}` : 'Not implemented'),
      row('Registered authority', registry.authority),
      row('Engine state', registry.engineState),
      row('Result presenter', registry.presenterRole ?? 'Not registered'),
      row('Lifecycle profile', stage.lifecycle?.profileId ?? 'Not initialized'),
      row('Lifecycle source binding', stage.lifecycleBinding?.status ?? 'UNINITIALIZED'),
      row('Qualification profile', textOr(profile?.identity)),
      row('Source schema', textOr(documentValue?.schema)),
    ],
    recoveryDisclosure: recoveryDisclosure(stage.stageId, documentValue),
    qualificationDetails: qualificationDetails(profile),
    limitations: [...registry.limitations, ...stringArray(documentValue?.limitations)],
  });
}

export function renderLafeaAnalysisSettings(root, stageValue) {
  if (!root?.ownerDocument) throw new TypeError('LAFEA_ANALYSIS_SETTINGS_ROOT_REQUIRED');
  const model = buildLafeaAnalysisSettingsViewModel(stageValue);
  const section = element(root, 'section', 'lafea-analysis-settings');
  section.dataset.role = 'lafea-analysis-settings';
  section.dataset.readOnly = 'true';
  section.append(element(
    root,
    'p',
    'lafea-analysis-settings__intro',
    'The first group comes from the active engineering model. The second group is governed solver authority and is locked here; this view never invents or edits qualification-controlled values.',
  ));

  const groups = element(root, 'div', 'lafea-analysis-settings__groups');
  groups.append(
    settingsGroup(root, 'Model-declared analysis settings', 'MODEL_SOURCE', model.modelRows),
    settingsGroup(root, 'Governed solver settings', 'GOVERNED_SOLVER', model.solverRows),
  );
  section.append(groups);

  if (model.recoveryDisclosure) {
    const recovery = element(root, 'p', 'lafea-analysis-settings__recovery', model.recoveryDisclosure);
    recovery.dataset.role = 'lafea-solver-recovery-policy';
    section.append(recovery);
  }

  if (model.qualificationDetails.length) {
    const details = element(root, 'details', 'lafea-analysis-settings__details');
    details.append(element(root, 'summary', null, `Locked qualification tolerances (${model.qualificationDetails.length})`));
    const qualificationList = element(root, 'ul');
    model.qualificationDetails.forEach((value) => qualificationList.append(element(root, 'li', null, value)));
    details.append(qualificationList);
    section.append(details);
  }

  if (model.limitations.length) {
    const limitations = element(root, 'details', 'lafea-analysis-settings__details');
    limitations.append(element(root, 'summary', null, `Current solver/stage limitations (${model.limitations.length})`));
    const limitationList = element(root, 'ul');
    model.limitations.forEach((value) => limitationList.append(element(root, 'li', null, value)));
    limitations.append(limitationList);
    section.append(limitations);
  }
  return section;
}

function settingsGroup(root, title, authority, rows) {
  const group = element(root, 'section', 'lafea-analysis-settings__group');
  group.dataset.authority = authority;
  const heading = element(root, 'div', 'lafea-analysis-settings__group-heading');
  heading.append(
    element(root, 'h3', null, title),
    element(root, 'span', 'lafea-analysis-settings__lock', authority === 'GOVERNED_SOLVER' ? 'LOCKED' : 'SOURCE'),
  );
  const list = element(root, 'dl', 'lafea-analysis-settings__list');
  for (const item of rows) {
    list.append(
      element(root, 'dt', null, item.label),
      element(root, 'dd', null, item.value),
    );
  }
  group.append(heading, list);
  return group;
}

function recoveryDisclosure(stageId, documentValue) {
  if (stageId !== 'LAFEA.3') return null;
  const families = [...new Set((documentValue?.elements ?? [])
    .map((row) => row?.elementType)
    .filter((value) => typeof value === 'string'))];
  if (families.some((value) => value === 'T6' || value === 'Q8')) {
    return 'Recovery authority: T6/Q8 integration-point stress is authoritative; projected nodal stress is display-only.';
  }
  return 'Recovery authority follows the registered LAFEA.3 continuum result contract.';
}

function requestSummary(value) {
  if (!value || typeof value !== 'object') return 'Not declared';
  if (Array.isArray(value.requestedAnalyses) && value.requestedAnalyses.length) {
    return value.requestedAnalyses.join(', ');
  }
  if (Array.isArray(value.loadCaseIds) && value.loadCaseIds.length) {
    return `Load cases: ${value.loadCaseIds.join(', ')}`;
  }
  if (Array.isArray(value.transformedLoadCaseIdentities)
    && value.transformedLoadCaseIdentities.length) {
    return `Load cases: ${value.transformedLoadCaseIdentities.join(', ')}`;
  }
  return 'Not declared';
}

function unitSummary(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'Not declared';
  const rows = Object.entries(value)
    .filter(([, unit]) => typeof unit === 'string' && unit)
    .map(([quantity, unit]) => `${quantity}: ${unit}`);
  return rows.length ? rows.join(' • ') : 'Not declared';
}

function codeBasisSummary(documentValue) {
  if (!documentValue || typeof documentValue !== 'object') return 'Not declared by the active stage source contract';
  const direct = displayValue(documentValue.codeBasis);
  if (direct) return direct;
  const settings = documentValue.analysisSettings;
  const nested = settings && typeof settings === 'object' ? displayValue(settings.codeBasis) : null;
  return nested ?? 'Not declared by the active stage source contract';
}

function qualificationDetails(profile) {
  if (!profile || typeof profile !== 'object') return [];
  const rows = [];
  if (typeof profile.schema === 'string') rows.push(`Schema: ${profile.schema}`);
  if (Number.isFinite(profile.frameMinimumSine)) rows.push(`Frame minimum sine: ${profile.frameMinimumSine}`);
  if (Number.isFinite(profile.handednessMinimumAlignment)) {
    rows.push(`Handedness minimum alignment: ${profile.handednessMinimumAlignment}`);
  }
  if (profile.tolerances && typeof profile.tolerances === 'object') {
    for (const [quantity, rule] of Object.entries(profile.tolerances)) {
      if (!rule || typeof rule !== 'object') continue;
      const absolute = Number.isFinite(rule.absolute) ? rule.absolute : 'n/a';
      const relative = Number.isFinite(rule.relative) ? rule.relative : 'n/a';
      rows.push(`${quantity} tolerance — absolute: ${absolute}, relative: ${relative}`);
    }
  }
  return rows;
}

function displayValue(value) {
  if (typeof value === 'string' && value) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const fields = Object.entries(value)
    .filter(([, item]) => ['string', 'number', 'boolean'].includes(typeof item))
    .map(([key, item]) => `${key}: ${item}`);
  return fields.length ? fields.join(' • ') : null;
}

function row(label, value) { return freeze({ label, value }); }
function textOr(value) { return typeof value === 'string' && value ? value : 'Not declared'; }
function stringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item) : [];
}
function requireStage(value) {
  if (!value || typeof value !== 'object' || typeof value.stageId !== 'string') {
    throw new TypeError('LAFEA_ANALYSIS_SETTINGS_STAGE_REQUIRED');
  }
  return value;
}
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
