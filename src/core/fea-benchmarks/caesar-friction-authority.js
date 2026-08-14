/**
 * Resolve governed CAESAR friction authority for one ACCDB load case.
 *
 * CAESAR keeps two distinct governed quantities:
 *
 *   - the model-input coefficient of friction `mu`, the highest-authority
 *     coefficient value for the file;
 *   - the per-load-case friction multiplier from the load-case report, which
 *     scales that coefficient for the case and is not a replacement coefficient.
 *
 * Effective friction is therefore `model mu x load-case friction multiplier`.
 * A case with multiplier 0 is a non-friction case even though the model still
 * declares a nonzero coefficient. Derived combination cases have no independent
 * multiplier: their friction state is inherited from the primitive cases they
 * combine, and a multiplier declared against them is meaningless.
 *
 * Friction stiffness is governed in displayed CAESAR units. BM4_L stores
 * translational stiffness in N/cm, so the SI value used by the solver is
 * recorded together with the explicit conversion factor rather than assumed.
 */
import { deepFreeze } from '../shared-piping-model/immutable.js';
import { resolveCaesarConfigurationLedger, resolveCaesarConfigurationSetting } from './caesar-configuration-authority.js';

export const CAESAR_FRICTION_AUTHORITY_SCHEMA = 'caesar-friction-authority/v1';

export const COEFFICIENT_SETTING = 'COEFFICIENT_OF_FRICTION_MU';
export const MULTIPLIER_SETTING = 'FRICTION_MULTIPLIER';
export const FRICTION_STIFFNESS_SETTING = 'FRICT_STIF';

/**
 * Accepted bases for the governed friction stiffness.
 *
 * CAESAR's configuration keeps friction stiffness in its internal English units
 * (lb/in, default 1.0E6). A profile may instead declare the displayed value
 * directly; the two are distinguished explicitly so no run silently applies the
 * wrong factor.
 */
export const FRICTION_STIFFNESS_UNITS = Object.freeze([
  'CAESAR_INTERNAL_ENGLISH_UNITS',
  'DISPLAYED_CAESAR_UNITS',
]);

/**
 * Displayed translational-stiffness unit to SI, used only as corroboration.
 *
 * The governed friction stiffness is not stored in displayed units: see
 * resolveCaesarFrictionStiffness.
 */
const TRANSLATIONAL_STIFFNESS_CONVERSION = Object.freeze({
  'N./cm.': Object.freeze({ factor: 100, siUnit: 'N/m', rule: 'N_PER_CM_TO_N_PER_M_TIMES_100' }),
  'N./mm.': Object.freeze({ factor: 1000, siUnit: 'N/m', rule: 'N_PER_MM_TO_N_PER_M_TIMES_1000' }),
  'N./m.': Object.freeze({ factor: 1, siUnit: 'N/m', rule: 'N_PER_M_IDENTITY' }),
});

/**
 * Displayed unit of the ACCDB translational-stiffness conversion constant.
 *
 * CAESAR stores one constant per unit family in INPUT_UNITS, converting its
 * internal English quantity into the displayed unit: CLENGTH 25.4 for in -> mm,
 * CFORCE 4.44822 for lb -> N, CTRANS 1.751270055770874 for lb/in -> N/cm. That
 * constant is model input and therefore the highest authority available for the
 * conversion.
 */
const INTERNAL_TO_DISPLAYED_CONSTANT_COLUMN = 'CTRANS';

const DERIVED_FORMULA = /^L(\d+)=L(\d+)([+-])L(\d+)$/u;

/**
 * Classify one case formula without inferring physics from case text.
 *
 * @param {Record<string, unknown>} caseRecord ACCDB case record.
 * @returns {Record<string, unknown>} Frozen classification.
 */
export function classifyCaesarCaseFormula(caseRecord) {
  const formula = String(caseRecord.formula ?? '').replace(/\s+/gu, '').toUpperCase();
  const derived = DERIVED_FORMULA.exec(formula);
  if (derived) {
    if (Number(derived[1]) !== Number(caseRecord.lcaseNumber)) {
      throw new TypeError(
        `${caseRecord.caseId} declares combination ${caseRecord.formula} for a different case number.`,
      );
    }
    if (derived[3] !== '-') {
      throw new TypeError(
        `${caseRecord.caseId} combination ${caseRecord.formula} is not a supported difference combination.`,
      );
    }
    return deepFreeze({
      kind: 'DERIVED_COMBINATION',
      formula,
      combination: 'DIFFERENCE',
      minuendCaseNumber: Number(derived[2]),
      subtrahendCaseNumber: Number(derived[4]),
      terms: null,
    });
  }
  const terms = formula.split('+').filter(Boolean);
  if (terms.length === 0) throw new TypeError(`${caseRecord.caseId} has an empty formula.`);
  if (new Set(terms).size !== terms.length) {
    throw new TypeError(`${caseRecord.caseId} repeats a load term in ${caseRecord.formula}.`);
  }
  return deepFreeze({
    kind: 'PRIMITIVE',
    formula,
    combination: null,
    minuendCaseNumber: null,
    subtrahendCaseNumber: null,
    terms: deepFreeze([...terms]),
  });
}

/**
 * Resolve the friction authority for one case, recursing through combinations.
 *
 * @param {object} input Resolution input.
 * @param {Record<string, unknown>} input.authority Configuration authority.
 * @param {Array<Record<string, unknown>>} input.cases Selected ACCDB case records.
 * @param {string} input.caseId Case to resolve.
 * @param {Array<Record<string, unknown>>} input.inputUnitRows ACCDB INPUT_UNITS rows.
 * @returns {Record<string, unknown>} Frozen friction authority record.
 */
export function resolveCaesarFrictionAuthority(input) {
  return resolveFriction(input, new Set());
}

/**
 * Resolve the friction authority of every selected case in case order.
 *
 * @param {object} input Same shape as resolveCaesarFrictionAuthority without caseId.
 * @returns {Record<string, unknown>} Frozen table keyed by case ID.
 */
export function resolveCaesarFrictionAuthorityTable(input) {
  const cases = {};
  for (const caseRecord of input.cases) {
    cases[caseRecord.caseId] = resolveCaesarFrictionAuthority({ ...input, caseId: caseRecord.caseId });
  }
  return deepFreeze({
    schema: 'caesar-friction-authority-table/v1',
    caseIds: deepFreeze(input.cases.map((row) => row.caseId)),
    cases,
  });
}

/**
 * Resolve governed friction stiffness in SI from displayed CAESAR units.
 *
 * @param {Record<string, unknown>} authority Configuration authority.
 * @param {Array<Record<string, unknown>>} inputUnitRows ACCDB INPUT_UNITS rows.
 * @returns {Record<string, unknown>} Frozen stiffness record with explicit conversion.
 */
export function resolveCaesarFrictionStiffness(authority, inputUnitRows) {
  const declared = resolveCaesarConfigurationSetting(authority, FRICTION_STIFFNESS_SETTING, null);
  const value = declared.value;
  if (!value || typeof value !== 'object' || !FRICTION_STIFFNESS_UNITS.includes(value.unit)) {
    throw new TypeError(
      `${FRICTION_STIFFNESS_SETTING} must be declared with unit ${FRICTION_STIFFNESS_UNITS.join(' or ')}.`,
    );
  }
  if (!(Number(value.value) > 0)) {
    throw new TypeError(`${FRICTION_STIFFNESS_SETTING} must be positive.`);
  }
  if (!Array.isArray(inputUnitRows) || inputUnitRows.length !== 1) {
    throw new TypeError('Friction stiffness conversion requires exactly one ACCDB INPUT_UNITS row.');
  }
  const displayedUnit = String(inputUnitRows[0].TRANS ?? '').trim();
  const displayedConversion = TRANSLATIONAL_STIFFNESS_CONVERSION[displayedUnit];
  if (!displayedConversion) {
    throw new TypeError(
      `ACCDB INPUT_UNITS translational stiffness unit ${displayedUnit || '<empty>'} has no governed friction-stiffness conversion.`,
    );
  }
  if (value.unit === 'DISPLAYED_CAESAR_UNITS') {
    return deepFreeze({
      setting: FRICTION_STIFFNESS_SETTING,
      level: declared.level,
      source: declared.source,
      basis: 'DISPLAYED_CAESAR_UNITS',
      declaredValue: Number(value.value),
      displayedValue: Number(value.value),
      displayedUnit,
      internalToDisplayedConstant: null,
      conversionFactor: displayedConversion.factor,
      conversionRule: displayedConversion.rule,
      siValue: Number(value.value) * displayedConversion.factor,
      siUnit: displayedConversion.siUnit,
    });
  }
  // Internal English basis: CAESAR's configuration default for friction stiffness
  // is 1.0E6 lb/in, and the ACCDB's own INPUT_UNITS constant converts that into the
  // displayed unit. Both steps are read from the source rather than assumed.
  const constant = Number(inputUnitRows[0][INTERNAL_TO_DISPLAYED_CONSTANT_COLUMN]);
  if (!Number.isFinite(constant) || constant <= 0) {
    throw new TypeError(
      `ACCDB INPUT_UNITS.${INTERNAL_TO_DISPLAYED_CONSTANT_COLUMN} is required to convert an internal-English `
      + `${FRICTION_STIFFNESS_SETTING}; declare the setting in displayed units instead of assuming a factor.`,
    );
  }
  const displayedValue = Number(value.value) * constant;
  return deepFreeze({
    setting: FRICTION_STIFFNESS_SETTING,
    level: declared.level,
    source: declared.source,
    basis: 'CAESAR_INTERNAL_ENGLISH_LB_PER_IN',
    declaredValue: Number(value.value),
    displayedValue,
    displayedUnit,
    internalToDisplayedConstant: constant,
    conversionFactor: constant * displayedConversion.factor,
    conversionRule: `INTERNAL_LB_PER_IN_TIMES_ACCDB_${INTERNAL_TO_DISPLAYED_CONSTANT_COLUMN}_THEN_${displayedConversion.rule}`,
    siValue: displayedValue * displayedConversion.factor,
    siUnit: displayedConversion.siUnit,
  });
}

function resolveFriction(input, active) {
  const caseRecord = requireCase(input.cases, input.caseId);
  const classification = classifyCaesarCaseFormula(caseRecord);
  const coefficient = requireDeclared(
    resolveCaesarConfigurationLedger(input.authority, COEFFICIENT_SETTING, caseRecord.caseId),
    `${caseRecord.caseId} ${COEFFICIENT_SETTING}`,
  );
  const modelCoefficient = numeric(coefficient.resolved.value, `${caseRecord.caseId} ${COEFFICIENT_SETTING}`);
  const stiffness = resolveCaesarFrictionStiffness(input.authority, input.inputUnitRows);
  if (classification.kind === 'PRIMITIVE') {
    const multiplierLedger = requireDeclared(
      resolveCaesarConfigurationLedger(input.authority, MULTIPLIER_SETTING, caseRecord.caseId),
      `${caseRecord.caseId} ${MULTIPLIER_SETTING}`,
    );
    const multiplier = numeric(multiplierLedger.resolved.value, `${caseRecord.caseId} ${MULTIPLIER_SETTING}`);
    if (multiplier < 0) throw new TypeError(`${caseRecord.caseId} ${MULTIPLIER_SETTING} must not be negative.`);
    return deepFreeze({
      schema: CAESAR_FRICTION_AUTHORITY_SCHEMA,
      caseId: caseRecord.caseId,
      lcaseNumber: caseRecord.lcaseNumber,
      caseClass: caseRecord.caseClass,
      formula: caseRecord.formula,
      kind: classification.kind,
      terms: classification.terms,
      coefficient: layerRecord(coefficient, modelCoefficient),
      frictionMultiplier: layerRecord(multiplierLedger, multiplier),
      effectiveCoefficient: modelCoefficient * multiplier,
      effectiveRule: 'EFFECTIVE_MU_EQUALS_MODEL_MU_TIMES_LOAD_CASE_FRICTION_MULTIPLIER_V1',
      frictionActive: modelCoefficient * multiplier > 0,
      frictionStiffness: stiffness,
      constituents: null,
      resolutionLedger: deepFreeze({ coefficient, frictionMultiplier: multiplierLedger }),
    });
  }
  if (active.has(caseRecord.caseId)) {
    throw new TypeError(`ACCDB combination formula cycle includes ${caseRecord.caseId}.`);
  }
  const nextActive = new Set(active);
  nextActive.add(caseRecord.caseId);
  const minuend = resolveFriction(
    { ...input, caseId: caseIdForNumber(input.cases, classification.minuendCaseNumber, caseRecord) },
    nextActive,
  );
  const subtrahend = resolveFriction(
    { ...input, caseId: caseIdForNumber(input.cases, classification.subtrahendCaseNumber, caseRecord) },
    nextActive,
  );
  if (minuend.effectiveCoefficient !== subtrahend.effectiveCoefficient) {
    throw new TypeError(
      `${caseRecord.caseId} combines ${minuend.caseId} (effective mu ${minuend.effectiveCoefficient}) `
      + `with ${subtrahend.caseId} (effective mu ${subtrahend.effectiveCoefficient}); `
      + 'a difference combination requires one common friction state.',
    );
  }
  const declaredMultiplier = resolveCaesarConfigurationLedger(
    input.authority,
    MULTIPLIER_SETTING,
    caseRecord.caseId,
  );
  const ownDeclaration = declaredMultiplier.candidates
    .find((entry) => entry.level === 'LOAD_CASE_SETTING' && entry.declared) ?? null;
  if (ownDeclaration !== null) {
    // A multiplier declared against a combination cannot govern anything: the
    // combination has no independent nonlinear solve. It is accepted only when it
    // agrees with the state both constituents already converged in, and is
    // otherwise a contradiction that must stop the run.
    const declaredEffective = modelCoefficient
      * numeric(ownDeclaration.value, `${caseRecord.caseId} ${MULTIPLIER_SETTING}`);
    if (declaredEffective !== minuend.effectiveCoefficient) {
      throw new TypeError(
        `${caseRecord.caseId} is a derived combination whose declared ${MULTIPLIER_SETTING} implies effective mu `
        + `${declaredEffective}, but its constituents converged at effective mu ${minuend.effectiveCoefficient}.`,
      );
    }
  }
  return deepFreeze({
    schema: CAESAR_FRICTION_AUTHORITY_SCHEMA,
    caseId: caseRecord.caseId,
    lcaseNumber: caseRecord.lcaseNumber,
    caseClass: caseRecord.caseClass,
    formula: caseRecord.formula,
    kind: classification.kind,
    terms: null,
    coefficient: layerRecord(coefficient, modelCoefficient),
    frictionMultiplier: deepFreeze({
      level: 'NOT_APPLICABLE',
      source: 'DERIVED_COMBINATION_HAS_NO_INDEPENDENT_FRICTION_MULTIPLIER',
      value: ownDeclaration === null ? null : Number(ownDeclaration.value),
      reason: ownDeclaration === null
        ? 'MEANINGLESS_FOR_DERIVED_COMBINATION'
        : 'DECLARED_BUT_REDUNDANT_FOR_DERIVED_COMBINATION_AND_CONSISTENT_WITH_CONSTITUENTS',
    }),
    effectiveCoefficient: minuend.effectiveCoefficient,
    effectiveRule: 'DERIVED_EFFECTIVE_MU_INHERITED_FROM_BOTH_PRIMITIVE_CONSTITUENTS_V1',
    frictionActive: minuend.effectiveCoefficient > 0,
    frictionStiffness: stiffness,
    constituents: deepFreeze({
      combination: 'DIFFERENCE',
      minuendCaseId: minuend.caseId,
      subtrahendCaseId: subtrahend.caseId,
      minuendKind: minuend.kind,
      subtrahendKind: subtrahend.kind,
    }),
    resolutionLedger: deepFreeze({ coefficient, frictionMultiplier: declaredMultiplier }),
  });
}

function layerRecord(ledger, value) {
  return deepFreeze({
    level: ledger.resolved.level,
    source: ledger.resolved.source,
    value,
    reason: null,
  });
}

function requireDeclared(ledger, label) {
  if (ledger.resolved === null) {
    throw new TypeError(
      `${label} has no declared authority value; declare it at a governed layer instead of assuming a default.`,
    );
  }
  return ledger;
}

function requireCase(cases, caseId) {
  const caseRecord = cases.find((row) => row.caseId === String(caseId));
  if (!caseRecord) throw new TypeError(`Friction authority requires selected case ${String(caseId)}.`);
  return caseRecord;
}

function caseIdForNumber(cases, lcaseNumber, owner) {
  const caseRecord = cases.find((row) => Number(row.lcaseNumber) === Number(lcaseNumber));
  if (!caseRecord) {
    throw new TypeError(
      `${owner.caseId} formula ${owner.formula} requires selected dependency L${lcaseNumber}.`,
    );
  }
  return caseRecord.caseId;
}

function numeric(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${label} must resolve to a finite number.`);
  return number;
}
