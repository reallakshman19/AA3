/** Governed projection of analysis/solver settings with explicit source-authority controls. */
import {
  FORMULATION_GUARDS,
  FORMULATIONS,
} from '../core/local-continuum/index.js';
import { createLafeaInfoDisclosure, rowsFromLafeaItems } from './lafea-info-disclosure.js';
import { element } from './lafea-workbench-dom.js';
import { lafeaUiStatusPresentation } from './lafea-ui-status.js';

export const LAFEA_ANALYSIS_SETTINGS_VIEW_SCHEMA = 'lafea-analysis-settings-view/v1';

const FORMULATION_LABELS = Object.freeze({
  [FORMULATIONS.PLANE_STRESS]: 'Plane stress',
  [FORMULATIONS.PLANE_STRAIN]: 'Plane strain — standard displacement',
  [FORMULATIONS.PLANE_STRAIN_BBAR]: 'Plane strain — B-bar (locking resistant)',
});

export function buildLafeaAnalysisSettingsViewModel(stageValue, registryEntryValue = null) {
  const stage = requireStage(stageValue);
  const registry = registryEntry(registryEntryValue);
  const documentValue = stage.document ?? null;
  const profile = documentValue?.qualificationProfile ?? null;
  const requests = documentValue?.resultRequests ?? null;
  const modelRows = [
    row('Model identity', textOr(documentValue?.modelIdentity)),
    row('Model version', textOr(documentValue?.modelVersion)),
    row('Formulation', formulationLabel(documentValue?.formulation)),
    row('Thickness policy', textOr(documentValue?.thicknessBasis?.policy)),
    row('Requested analyses / cases', requestSummary(requests)),
    row('Unit basis', unitSummary(documentValue?.units)),
    row('Code / allowable basis', codeBasisSummary(documentValue)),
    row('Load combinations', loadCombinationSummary(documentValue)),
    row('Stress quantity', textOr(documentValue?.analysisSettings?.stressQuantity) ?? 'Not declared'),
    row('Allowable value', allowableValueSummary(documentValue)),
  ];
  const solverRows = [
    row('Registered engine', registry.enginePackage ? `src/core/${registry.enginePackage}` : 'Provided by workbench registry'),
    row('Registered authority', registry.authority ?? 'Provided by workbench registry'),
    row('Engine state', registry.engineState ?? 'Provided by workbench registry'),
    row('Result presenter', registry.presenterRole ?? 'Provided by workbench registry'),
    row('Lifecycle profile', stage.lifecycle?.profileId ?? 'Not initialized'),
    row('Lifecycle source binding', stage.lifecycleBinding?.status ?? 'UNINITIALIZED'),
    row('Qualification profile', textOr(profile?.identity)),
    row('Source schema', textOr(documentValue?.schema)),
  ];
  const solverSummaryRows = [
    row('Solver route', solverRouteLabel(registry.enginePackage)),
    row('Availability', statusLabel(registry.engineState ?? 'ENGINE_NOT_IMPLEMENTED')),
    row('Source binding', statusLabel(stage.lifecycleBinding?.status ?? 'UNINITIALIZED')),
    row('Qualification profile', profile?.identity ? 'Configured' : 'Not declared'),
  ];
  return freeze({
    schema: LAFEA_ANALYSIS_SETTINGS_VIEW_SCHEMA,
    stageId: stage.stageId,
    readOnly: false,
    modelRows,
    solverRows,
    solverSummaryRows,
    rows: [...modelRows, ...solverRows],
    formulationControl: stage.stageId === 'LAFEA.3'
      ? buildFormulationControl(stage, documentValue)
      : null,
    recoveryDisclosure: recoveryDisclosure(stage.stageId, documentValue),
    qualificationDetails: qualificationDetails(profile),
    limitations: [...registry.limitations, ...stringArray(documentValue?.limitations)],
  });
}

export function renderLafeaAnalysisSettings(
  root,
  stageValue,
  registryEntryValue = null,
  handlers = {},
) {
  if (!root?.ownerDocument) throw new TypeError('LAFEA_ANALYSIS_SETTINGS_ROOT_REQUIRED');
  const model = buildLafeaAnalysisSettingsViewModel(stageValue, registryEntryValue);
  const section = element(root, 'section', 'lafea-analysis-settings');
  section.dataset.role = 'lafea-analysis-settings';
  section.dataset.readOnly = 'false';
  section.append(element(
    root,
    'p',
    'lafea-analysis-settings__intro',
    'Configure only the stage-authorized analysis choices here. Source identity, solver custody and qualification metadata remain available as supporting evidence without occupying the primary workflow.',
  ));

  if (model.formulationControl) {
    section.append(formulationControl(root, stageValue, model.formulationControl, handlers));
  }

  const groups = element(root, 'div', 'lafea-analysis-settings__groups');
  groups.dataset.role = 'lafea-analysis-settings-primary';
  groups.append(
    settingsGroup(root, {
      title: 'Model-declared analysis settings',
      authority: 'MODEL_SOURCE',
      visibleRows: [],
      infoTitle: 'Source metadata',
      infoRows: model.modelRows,
    }),
    settingsGroup(root, {
      title: 'Solver readiness',
      authority: 'GOVERNED_SOLVER',
      visibleRows: model.solverSummaryRows.filter((item) => (
        item.label === 'Availability' || item.label === 'Source binding'
      )),
      infoTitle: 'Solver contract metadata',
      infoRows: model.solverSummaryRows,
    }),
  );
  section.append(groups, technicalSettings(root, model.solverRows));

  if (model.recoveryDisclosure) {
    section.append(textDisclosure(root, 'Recovery policy', model.recoveryDisclosure, 'lafea-solver-recovery-policy'));
  }

  if (model.qualificationDetails.length) {
    const details = element(root, 'details', 'lafea-analysis-settings__details');
    details.dataset.role = 'lafea-technical-evidence';
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

function formulationControl(root, stageValue, control, handlers) {
  const card = element(root, 'section', 'lafea-analysis-settings__group');
  card.dataset.role = 'lafea3-formulation-selector';
  card.dataset.authority = 'MODEL_SOURCE';
  card.dataset.status = control.status;
  const heading = element(root, 'div', 'lafea-analysis-settings__group-heading');
  heading.append(
    element(root, 'h3', null, 'Continuum formulation'),
    createLafeaInfoDisclosure(root.ownerDocument, 'Continuum formulation basis', [
      ['Current', formulationLabel(control.current)],
      ['Poisson ratio(s)', control.poissonRatios || 'Not declared'],
      ['Retained mesh families', control.retainedMeshFamilies || 'No retained mesh'],
      ['B-bar element authority', 'T6 / Q8 only; actual T3 solver mesh blocks before stiffness assembly'],
      ['B-bar temperature authority', 'Not granted — temperature/eigenstrain loads are blocked'],
      ['Legacy plane-strain hard block', `ν ≥ ${FORMULATION_GUARDS.planeStrainPoissonBlock}`],
      ['Qualification state', statusLabel(control.status)],
    ], {
      role: 'lafea3-formulation-info',
      className: 'lafea-analysis-settings__info',
    }),
    element(root, 'span', 'lafea-analysis-settings__lock', 'Source input'),
  );
  const select = element(root, 'select');
  select.dataset.role = 'lafea3-formulation-select';
  select.disabled = !control.editable || typeof handlers.onApplyJson !== 'function';
  for (const optionValue of control.options) {
    const option = element(root, 'option', null, optionValue.label);
    option.value = optionValue.value;
    option.selected = optionValue.value === control.current;
    option.disabled = optionValue.disabled;
    if (optionValue.reason) option.title = optionValue.reason;
    select.append(option);
  }
  const status = element(root, 'p', 'lafea-analysis-settings__recovery', control.message);
  status.dataset.role = 'lafea3-formulation-selector-status';
  status.dataset.status = control.status;
  select.addEventListener('change', () => {
    if (typeof handlers.onApplyJson !== 'function' || !stageValue?.document) return;
    const next = structuredClone(stageValue.document);
    next.formulation = select.value;
    handlers.onApplyJson(`${JSON.stringify(next, null, 2)}\n`);
  });
  card.append(heading, select, status);
  return card;
}

function buildFormulationControl(stage, documentValue) {
  const current = typeof documentValue?.formulation === 'string'
    ? documentValue.formulation
    : FORMULATIONS.PLANE_STRESS;
  const ratios = (documentValue?.materials ?? [])
    .map((row) => Number.isFinite(row?.poissonRatio) ? row.poissonRatio : null)
    .filter((value) => value !== null);
  const maximumNu = ratios.length ? Math.max(...ratios) : null;
  const hasTemperature = (documentValue?.loadCases ?? []).some(
    (loadCase) => Array.isArray(loadCase?.temperatureLoads) && loadCase.temperatureLoads.length > 0,
  );
  const retainedMesh = stage.retainedAnalysisMeshEvidenceV2?.mesh
    ?? stage.retainedAnalysisMeshEvidence?.mesh
    ?? null;
  const retainedFamilies = [...new Set((retainedMesh?.elements ?? [])
    .map((row) => row?.elementType)
    .filter((value) => typeof value === 'string'))].sort();
  const retainedT3 = retainedFamilies.includes('T3');
  const standardBlocked = maximumNu !== null
    && maximumNu >= FORMULATION_GUARDS.planeStrainPoissonBlock;
  const options = [
    { value: FORMULATIONS.PLANE_STRESS, label: FORMULATION_LABELS[FORMULATIONS.PLANE_STRESS] },
    {
      value: FORMULATIONS.PLANE_STRAIN,
      label: FORMULATION_LABELS[FORMULATIONS.PLANE_STRAIN],
      disabled: standardBlocked && current !== FORMULATIONS.PLANE_STRAIN,
      reason: standardBlocked
        ? `Current material has ν ≥ ${FORMULATION_GUARDS.planeStrainPoissonBlock}; the displacement-only plane-strain formulation remains outside its qualified envelope.`
        : null,
    },
    {
      value: FORMULATIONS.PLANE_STRAIN_BBAR,
      label: FORMULATION_LABELS[FORMULATIONS.PLANE_STRAIN_BBAR],
      disabled: hasTemperature && current !== FORMULATIONS.PLANE_STRAIN_BBAR,
      reason: hasTemperature
        ? 'B-bar thermal/eigenstrain authority is not yet qualified. Remove temperature loads before selecting B-bar.'
        : null,
    },
  ].map((row) => freeze({ ...row, disabled: Boolean(row.disabled) }));

  let status = 'QUALIFIED_SOURCE_INPUT';
  let message = 'Plane stress uses the existing qualified continuum route.';
  if (current === FORMULATIONS.PLANE_STRAIN) {
    if (standardBlocked) {
      status = 'BLOCKED';
      message = `Standard displacement plane strain is blocked for ν ≥ ${FORMULATION_GUARDS.planeStrainPoissonBlock}.`;
    } else if (maximumNu !== null && maximumNu >= FORMULATION_GUARDS.planeStrainPoissonWarning) {
      status = 'ADVISORY';
      message = 'Standard displacement plane strain is inside the hard source envelope but near the incompressible limit; use B-bar for the separately qualified locking-resistant route.';
    } else {
      status = 'QUALIFIED_SOURCE_INPUT';
      message = 'Standard displacement plane strain retains the existing source-controlled incompressibility guard.';
    }
  } else if (current === FORMULATIONS.PLANE_STRAIN_BBAR) {
    if (hasTemperature) {
      status = 'BLOCKED';
      message = 'B-bar temperature/eigenstrain loading is not qualified.';
    } else if (retainedT3) {
      status = 'MESH_REGENERATION_REQUIRED';
      message = 'The retained mesh contains T3. Regenerate a T6 or Q8 mesh before B-bar solve authorization; source placeholder T3 connectivity is not solver authority.';
    } else if (retainedFamilies.length === 0) {
      status = 'MESH_REQUIRED';
      message = 'B-bar source selection is valid for mechanical loading; generate and qualify a T6 or Q8 mesh before solving.';
    } else {
      status = 'EXACT_HEAD_QUALIFICATION_REQUIRED';
      message = 'T6/Q8 B-bar mechanical route is configured. Exact-head frozen ν/distortion qualification evidence is required before any broader release claim.';
    }
  }

  return freeze({
    current,
    editable: Boolean(documentValue),
    poissonRatios: ratios.join(', '),
    retainedMeshFamilies: retainedFamilies.join(' / '),
    hasTemperature,
    status,
    message,
    options,
  });
}

function settingsGroup(root, configuration) {
  const { title, authority, visibleRows, infoTitle, infoRows } = configuration;
  const group = element(root, 'section', 'lafea-analysis-settings__group');
  group.dataset.authority = authority;
  const heading = element(root, 'div', 'lafea-analysis-settings__group-heading');
  heading.append(element(root, 'h3', null, title));
  if (infoRows?.length) {
    heading.append(createLafeaInfoDisclosure(
      root.ownerDocument,
      infoTitle,
      rowsFromLafeaItems(infoRows),
      { className: 'lafea-analysis-settings__info' },
    ));
  }
  heading.append(element(
    root,
    'span',
    'lafea-analysis-settings__lock',
    authority === 'GOVERNED_SOLVER' ? 'Governed' : 'Source',
  ));
  group.append(heading);
  if (visibleRows?.length) {
    const list = element(root, 'dl', 'lafea-analysis-settings__list');
    for (const item of visibleRows) {
      list.append(
        element(root, 'dt', null, item.label),
        element(root, 'dd', null, item.value),
      );
    }
    group.append(list);
  }
  return group;
}

function technicalSettings(root, rows) {
  const details = element(root, 'details', 'lafea-analysis-settings__details');
  details.dataset.role = 'lafea-technical-evidence';
  details.append(element(root, 'summary', null, 'Technical identifiers and lifecycle custody'));
  const list = element(root, 'dl', 'lafea-analysis-settings__list');
  for (const item of rows) {
    list.append(
      element(root, 'dt', null, item.label),
      element(root, 'dd', null, item.value),
    );
  }
  details.append(list);
  return details;
}

function textDisclosure(root, title, text, role) {
  const details = element(root, 'details', 'lafea-analysis-settings__details');
  details.dataset.role = role;
  details.append(
    element(root, 'summary', null, title),
    element(root, 'p', 'lafea-analysis-settings__recovery', text),
  );
  return details;
}

function registryEntry(value) {
  if (!value || typeof value !== 'object') {
    return { enginePackage: null, authority: null, engineState: null, presenterRole: null, limitations: [] };
  }
  return {
    enginePackage: typeof value.enginePackage === 'string' ? value.enginePackage : null,
    authority: typeof value.authority === 'string' ? value.authority : null,
    engineState: typeof value.engineState === 'string' ? value.engineState : null,
    presenterRole: typeof value.presenterRole === 'string' ? value.presenterRole : null,
    limitations: stringArray(value.limitations),
  };
}

function recoveryDisclosure(stageId, documentValue) {
  if (stageId !== 'LAFEA.3') return null;
  if (documentValue?.formulation === FORMULATIONS.PLANE_STRAIN_BBAR) {
    return 'B-bar T6/Q8 stress uses pointwise deviatoric strain plus the retained element-mean dilatation used by stiffness. Integration-point stress remains authoritative; projected nodal stress is display-only.';
  }
  const families = [...new Set((documentValue?.elements ?? [])
    .map((row) => row?.elementType)
    .filter((value) => typeof value === 'string'))];
  if (families.some((value) => value === 'T6' || value === 'Q8')) {
    return 'T6/Q8 integration-point stress is authoritative; projected nodal stress is display-only.';
  }
  return 'Recovery authority follows the registered LAFEA.3 continuum result contract.';
}

function requestSummary(value) {
  if (!value || typeof value !== 'object') return 'Not declared';
  if (Array.isArray(value.requestedAnalyses) && value.requestedAnalyses.length) return value.requestedAnalyses.join(', ');
  if (Array.isArray(value.loadCaseIds) && value.loadCaseIds.length) return `Load cases: ${value.loadCaseIds.join(', ')}`;
  if (Array.isArray(value.transformedLoadCaseIdentities) && value.transformedLoadCaseIdentities.length) {
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

function loadCombinationSummary(documentValue) {
  const factors = documentValue?.analysisSettings?.loadCombinationFactors;
  if (!factors || typeof factors !== 'object' || Array.isArray(factors)) return 'Not declared';
  const rows = Object.entries(factors)
    .map(([caseId, factor]) => `${caseId}: ${factor}`);
  return rows.length ? rows.join(', ') : 'Not declared';
}

function allowableValueSummary(documentValue) {
  const val = documentValue?.analysisSettings?.allowableValue;
  if (typeof val === 'number') return String(val);
  if (!val || typeof val !== 'object') return 'Not declared';
  if (typeof val.value === 'number') return `${val.value} ${val.unit ?? ''}`.trim();
  return 'Not declared';
}

function qualificationDetails(profile) {
  if (!profile || typeof profile !== 'object') return [];
  const rows = [];
  if (typeof profile.schema === 'string') rows.push(`Schema: ${profile.schema}`);
  if (Number.isFinite(profile.frameMinimumSine)) rows.push(`Frame minimum sine: ${profile.frameMinimumSine}`);
  if (Number.isFinite(profile.handednessMinimumAlignment)) rows.push(`Handedness minimum alignment: ${profile.handednessMinimumAlignment}`);
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

function formulationLabel(value) {
  return FORMULATION_LABELS[value] ?? textOr(value);
}
function solverRouteLabel(enginePackage) {
  if (enginePackage === 'local-continuum') return 'Linear continuum solver';
  if (enginePackage === 'local-shell') return 'Linear thin-shell solver';
  if (!enginePackage) return 'Not implemented';
  return 'Registered stage solver';
}
function statusLabel(value) { return lafeaUiStatusPresentation(value).label; }
function row(label, value) { return freeze({ label, value }); }
function textOr(value) { return typeof value === 'string' && value ? value : 'Not declared'; }
function stringArray(value) { return Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item) : []; }
function requireStage(value) {
  if (!value || typeof value !== 'object' || typeof value.stageId !== 'string') throw new TypeError('LAFEA_ANALYSIS_SETTINGS_STAGE_REQUIRED');
  return value;
}
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}