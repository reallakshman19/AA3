import { semanticHash } from '../../core/shared-piping-model/canonical-json.js';
import { clonePlain, freezeDeep, isRecord, stringValue } from '../dataset-utils.js';

export const NON_FEA_FLUID_FILL_POLICY_SCHEMA = 'non-fea-fluid-fill-policy/v1';
export const NON_FEA_FLUID_FILL_RESOLUTION_SCHEMA = 'non-fea-fluid-fill-resolution/v1';

const PROJECT_DATA_PATH = 'thermoMechanicalBasis.fluidPhaseAndFillState';
const CANONICAL_CASES = Object.freeze(['EMPTY', 'OPE', 'HYD']);
const PHASES = new Set(['EMPTY', 'LIQUID', 'GAS', 'MIXED', 'UNSPECIFIED']);

/**
 * Resolves the governed fluid-content policy for one canonical load case and
 * line. Selection precedence is deterministic:
 *
 *   line + case > case > policy default
 *
 * Generic/default rules apply only to OPE/HYD. Canonical EMPTY remains dry
 * unless an explicit EMPTY rule is supplied, and any explicit non-zero EMPTY
 * rule fails closed. This preserves legacy `{ DEFAULT: 'LIQUID_FULL' }` policy
 * without turning the EMPTY case into a fluid-filled case.
 *
 * OPE/HYD zero fill is a valid governed content state. This resolver only
 * authorizes the fraction; downstream execution must still prove that an exact
 * zero fluid mass comes from positive raw-density authority times this governed
 * zero fill. Naked zero density and epsilon-density substitution are not
 * authorized here.
 */
export function resolveNonFeaFluidFillPolicy({ profile, loadCaseId, lineKey } = {}) {
  const caseId = stringValue(loadCaseId).toUpperCase();
  const key = stringValue(lineKey);
  if (!CANONICAL_CASES.includes(caseId)) {
    throw codedError(
      `Unsupported canonical fluid load case: ${caseId || 'EMPTY'}.`,
      'EMPIRICAL_FLUID_FILL_CASE_INVALID',
      { loadCaseId },
    );
  }
  if (!key) {
    throw codedError('Fluid fill resolution requires a line key.', 'EMPIRICAL_FLUID_FILL_LINE_KEY_REQUIRED');
  }
  const entry = profile?.thermoMechanicalBasis?.fluidPhaseAndFillState;
  requireEvidenceEntry(entry);
  const selected = selectPolicy(entry.value, caseId, key);
  if (!selected) {
    throw codedError(
      `No governed fluid fill policy resolves for ${key} / ${caseId}.`,
      'EMPIRICAL_FLUID_FILL_POLICY_SELECTION_REQUIRED',
      { projectDataPath: PROJECT_DATA_PATH, lineKey: key, loadCaseId: caseId },
    );
  }
  const normalized = normalizeSelection(selected.value, caseId);
  if (caseId === 'EMPTY' && normalized.fillFraction !== 0) {
    throw codedError(
      'Canonical EMPTY gravity case must remain zero fluid content.',
      'EMPIRICAL_FLUID_EMPTY_CASE_NONZERO_UNSUPPORTED',
      { lineKey: key, fillFraction: normalized.fillFraction, selector: selected.selector },
    );
  }

  const material = {
    schema: NON_FEA_FLUID_FILL_RESOLUTION_SCHEMA,
    projectDataPath: PROJECT_DATA_PATH,
    lineKey: key,
    loadCaseId: caseId,
    selector: selected.selector,
    selectionAuthority: selected.authority,
    fillFraction: normalized.fillFraction,
    phase: normalized.phase,
    state: normalized.state,
    sourceAuthority: stringValue(entry.evidence?.authority) || 'PROJECT_POLICY',
    source: stringValue(entry.evidence?.source),
    policyEntrySemanticHash: semanticHash(entry),
    selectedPolicySemanticHash: semanticHash(selected.value),
  };
  return freezeDeep({ ...material, semanticHash: semanticHash(material) });
}

export function validateNonFeaFluidFillPolicy(value) {
  const errors = [];
  try {
    validatePolicyStructure(value);
  } catch (error) {
    errors.push(freezeDeep({
      code: error?.code || 'INVALID_FLUID_FILL_POLICY',
      message: error instanceof Error ? error.message : String(error),
    }));
  }
  return freezeDeep({ valid: errors.length === 0, errors });
}

function validatePolicyStructure(value) {
  if (value === null || value === undefined) return;
  if (isSelectionValue(value)) {
    normalizeSelection(value, 'OPE');
    return;
  }
  if (!isRecord(value)) {
    throw codedError('Fluid fill policy must be a policy object or supported selection value.', 'INVALID_FLUID_FILL_POLICY');
  }
  if (value.schema && value.schema !== NON_FEA_FLUID_FILL_POLICY_SCHEMA) {
    throw codedError(`Expected ${NON_FEA_FLUID_FILL_POLICY_SCHEMA}.`, 'INVALID_FLUID_FILL_POLICY_SCHEMA');
  }
  const selections = [];
  if (Object.hasOwn(value, 'default')) selections.push(['default', value.default]);
  if (Object.hasOwn(value, 'DEFAULT')) selections.push(['DEFAULT', value.DEFAULT]);
  if (isRecord(value.cases)) {
    Object.entries(value.cases).forEach(([caseId, selection]) => selections.push([`cases.${caseId}`, selection]));
  }
  if (isRecord(value.lines)) {
    Object.entries(value.lines).forEach(([lineKey, byCase]) => {
      if (!isRecord(byCase)) throw codedError(`lines.${lineKey} must be keyed by canonical case.`, 'INVALID_FLUID_FILL_LINE_POLICY');
      Object.entries(byCase).forEach(([caseId, selection]) => selections.push([`lines.${lineKey}.${caseId}`, selection]));
    });
  }
  CANONICAL_CASES.forEach((caseId) => {
    if (Object.hasOwn(value, caseId)) selections.push([caseId, value[caseId]]);
  });
  if (selections.length === 0) {
    throw codedError('Fluid fill policy contains no selectable default/case/line rule.', 'EMPTY_FLUID_FILL_POLICY');
  }
  selections.forEach(([selector, selection]) => {
    const caseId = selector.endsWith('.EMPTY') || selector === 'EMPTY' ? 'EMPTY'
      : selector.endsWith('.HYD') || selector === 'HYD' ? 'HYD'
        : 'OPE';
    try {
      normalizeSelection(selection, caseId);
    } catch (error) {
      throw codedError(`${selector}: ${error.message}`, error.code || 'INVALID_FLUID_FILL_SELECTION');
    }
  });
}

function selectPolicy(value, caseId, lineKey) {
  if (isSelectionValue(value)) {
    return caseId === 'EMPTY'
      ? canonicalEmptySelection()
      : { selector: 'DIRECT', value, authority: 'DIRECT_POLICY' };
  }
  if (!isRecord(value)) return caseId === 'EMPTY' ? canonicalEmptySelection() : null;

  const lineRules = isRecord(value.lines?.[lineKey])
    ? value.lines[lineKey]
    : (isRecord(value[lineKey]) ? value[lineKey] : null);
  if (lineRules && Object.hasOwn(lineRules, caseId)) {
    return { selector: `LINE:${lineKey}:${caseId}`, value: lineRules[caseId], authority: 'LINE_CASE' };
  }
  if (isRecord(value.cases) && Object.hasOwn(value.cases, caseId)) {
    return { selector: `CASE:${caseId}`, value: value.cases[caseId], authority: 'CASE' };
  }
  if (Object.hasOwn(value, caseId)) {
    return { selector: `CASE:${caseId}`, value: value[caseId], authority: 'CASE' };
  }
  if (caseId === 'EMPTY') return canonicalEmptySelection();
  if (Object.hasOwn(value, 'default')) {
    return { selector: 'DEFAULT', value: value.default, authority: 'DEFAULT' };
  }
  if (Object.hasOwn(value, 'DEFAULT')) {
    return { selector: 'DEFAULT', value: value.DEFAULT, authority: 'DEFAULT' };
  }
  return null;
}

function canonicalEmptySelection() {
  return {
    selector: 'CANONICAL:EMPTY',
    value: 'EMPTY',
    authority: 'CANONICAL_CASE_POLICY',
  };
}

function normalizeSelection(value, caseId) {
  if (typeof value === 'number') return normalizedFraction(value, 'UNSPECIFIED', 'FRACTION');
  if (typeof value === 'string') return tokenSelection(value);
  if (!isRecord(value)) {
    throw codedError('Fluid fill selection must be a token, fraction, or object.', 'INVALID_FLUID_FILL_SELECTION');
  }
  if (Object.hasOwn(value, 'state')) {
    const token = tokenSelection(value.state);
    if (Object.hasOwn(value, 'fillFraction') && Number(value.fillFraction) !== token.fillFraction) {
      throw codedError('Fluid fill state conflicts with explicit fillFraction.', 'CONFLICTING_FLUID_FILL_SELECTION');
    }
    const phase = normalizePhase(value.phase ?? token.phase);
    return normalizedFraction(token.fillFraction, phase, token.state);
  }
  if (!Object.hasOwn(value, 'fillFraction')) {
    throw codedError('Fluid fill selection object requires fillFraction or state.', 'MISSING_FLUID_FILL_FRACTION');
  }
  const phase = normalizePhase(value.phase ?? (caseId === 'EMPTY' ? 'EMPTY' : 'UNSPECIFIED'));
  return normalizedFraction(value.fillFraction, phase, stringValue(value.state) || 'FRACTION');
}

function tokenSelection(value) {
  const token = stringValue(value).toUpperCase();
  const tokens = {
    EMPTY: [0, 'EMPTY'],
    DRY: [0, 'EMPTY'],
    LIQUID_FULL: [1, 'LIQUID'],
    GAS_FULL: [1, 'GAS'],
    MIXED_FULL: [1, 'MIXED'],
    FULL: [1, 'UNSPECIFIED'],
  };
  const row = tokens[token];
  if (!row) {
    throw codedError(`Unsupported fluid fill state: ${token || 'EMPTY'}.`, 'INVALID_FLUID_FILL_STATE');
  }
  return normalizedFraction(row[0], row[1], token);
}

function normalizedFraction(value, phase, state) {
  const fillFraction = Number(value);
  if (!Number.isFinite(fillFraction) || fillFraction < 0 || fillFraction > 1) {
    throw codedError('Fluid fill fraction must be finite in [0, 1].', 'INVALID_FLUID_FILL_FRACTION');
  }
  return freezeDeep({
    fillFraction,
    phase: normalizePhase(phase),
    state: stringValue(state).toUpperCase() || 'FRACTION',
  });
}

function normalizePhase(value) {
  const phase = stringValue(value).toUpperCase() || 'UNSPECIFIED';
  if (!PHASES.has(phase)) {
    throw codedError(`Unsupported fluid phase: ${phase}.`, 'INVALID_FLUID_PHASE');
  }
  return phase;
}

function isSelectionValue(value) {
  return typeof value === 'string'
    || typeof value === 'number'
    || (isRecord(value) && (Object.hasOwn(value, 'fillFraction') || Object.hasOwn(value, 'state')));
}

function requireEvidenceEntry(entry) {
  if (!isRecord(entry)
      || !Object.hasOwn(entry, 'value')
      || entry.approved !== true
      || !isRecord(entry.evidence)
      || !stringValue(entry.evidence.source)) {
    throw codedError(
      'Fluid fill policy requires approved Project/Product evidence before gravity execution.',
      'EMPIRICAL_FLUID_FILL_POLICY_AUTHORITY_INVALID',
      { projectDataPath: PROJECT_DATA_PATH },
    );
  }
  if (entry.value === null || entry.value === undefined) {
    throw codedError(
      'Fluid fill policy is missing.',
      'EMPIRICAL_FLUID_FILL_POLICY_REQUIRED',
      { projectDataPath: PROJECT_DATA_PATH },
    );
  }
}

function codedError(message, code, details = null) {
  const error = new Error(message);
  error.code = code;
  error.details = details === null ? null : clonePlain(details);
  return error;
}
