/**
 * Build a deterministic benchmark package from a read-only ACCDB export and explicit profile.
 * The package carries input-table custody, discovered cases and normalized reference results.
 */
import { canonicalStringify, semanticHash } from '../shared-piping-model/canonical-json.js';
import { deepFreeze } from '../shared-piping-model/immutable.js';
import { buildCaesarAccdbReferenceCase, buildCaesarElementIndex } from './caesar-accdb-reference.js';
import { temperatureToKelvin } from './caesar-accdb-units.js';

export const CAESAR_ACCDB_PROFILE_SCHEMA = 'caesar-accdb-benchmark-profile/v1';
export const CAESAR_ACCDB_PACKAGE_SCHEMA = 'caesar-accdb-benchmark-package/v1';
export const CAESAR_ACCDB_RESULT_FAMILIES = Object.freeze([
  'DISPLACEMENT', 'RESTRAINT_REACTION', 'GLOBAL_ELEMENT_END_ACTION', 'NODAL_EQUILIBRIUM',
]);

export const CAESAR_ACCDB_NODE_SELECTIONS = Object.freeze([
  'ALL_OUTPUT_NODES', 'INPUT_ENDPOINT_NODES',
]);

export const CAESAR_BOURDON_PRESSURE_EFFECT_MODES = Object.freeze([
  'DISABLED', 'TRANSLATION_ONLY', 'TRANSLATION_AND_ROTATION',
]);

const FAMILY_TABLES = Object.freeze({
  DISPLACEMENT: Object.freeze(['OUTPUT_DISPLACEMENTS']),
  RESTRAINT_REACTION: Object.freeze(['OUTPUT_RESTRAINTS_SUMMARY']),
  GLOBAL_ELEMENT_END_ACTION: Object.freeze(['OUTPUT_GLOBAL_ELEMENT_FORCES']),
  NODAL_EQUILIBRIUM: Object.freeze(['OUTPUT_GLOBAL_ELEMENT_FORCES', 'OUTPUT_RESTRAINTS_SUMMARY']),
});

const MODEL_TABLES = Object.freeze([
  'INPUT_BASIC_ELEMENT_DATA', 'INPUT_BENDS', 'INPUT_CONTROL', 'INPUT_FORCMNT',
  'INPUT_NODAL_COORDINATES', 'INPUT_OFFSETS', 'INPUT_REDUCERS', 'INPUT_RESTRAINTS',
  'INPUT_RIGIDS', 'INPUT_SIFTEES', 'INPUT_UNITS',
]);

/** Return the exact table set required before opening an ACCDB. */
export function requiredCaesarAccdbTables(profileInput) {
  const profile = normalizeProfile(profileInput);
  const output = profile.resultFamilies.flatMap((family) => FAMILY_TABLES[family]);
  return Object.freeze([...new Set([...MODEL_TABLES, ...output])].sort(compareText));
}

/** Normalize one read-only ACCDB extraction into a deterministic benchmark package. */
export function buildCaesarAccdbBenchmarkPackage(input) {
  const profile = normalizeProfile(input.profile);
  const raw = normalizeRawExport(input.rawExport);
  const requiredTables = requiredCaesarAccdbTables(profile);
  const missing = requiredTables.filter((name) => !raw.tables[name]);
  if (missing.length > 0) throw new TypeError(`ACCDB extraction is missing required tables: ${missing.join(', ')}.`);

  const discoveredCases = discoverCases(raw.tables, profile.resultFamilies);
  const selectedCases = selectCases(discoveredCases, profile.caseSelection);
  const model = buildModelRecord(raw, profile);
  const elementIndex = buildCaesarElementIndex(raw.tables.INPUT_BASIC_ELEMENT_DATA.rows);
  const selectedNodeIds = selectedReferenceNodeIds(
    raw.tables.INPUT_BASIC_ELEMENT_DATA.rows,
    profile.nodeSelection,
  );
  const references = {};
  for (const caseRecord of selectedCases) {
    references[caseRecord.caseId] = buildCaesarAccdbReferenceCase({
      caseRecord,
      tables: raw.tables,
      resultFamilies: profile.resultFamilies,
      conventions: profile.conventions,
      elementIndex,
      equilibriumTolerance: profile.equilibriumTolerance,
      selectedNodeIds,
    });
  }

  const sourceIdentity = {
    fileName: raw.source.fileName,
    byteLength: raw.source.byteLength,
    lastWriteTimeUtc: raw.source.lastWriteTimeUtc,
    sha256: raw.source.sha256,
  };
  const base = {
    schema: CAESAR_ACCDB_PACKAGE_SCHEMA,
    benchmarkId: profile.benchmarkId,
    profile,
    source: { ...sourceIdentity, linkedPath: raw.source.path, provider: raw.provider },
    model,
    cases: selectedCases,
    references,
  };
  return deepFreeze({ ...base, semanticHash: semanticHash({ ...base, source: sourceIdentity }) });
}

function normalizeProfile(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('ACCDB benchmark profile is required.');
  if (value.schema !== CAESAR_ACCDB_PROFILE_SCHEMA) throw new TypeError(`Unsupported ACCDB benchmark profile schema ${String(value.schema)}.`);
  const resultFamilies = uniqueStrings(value.resultFamilies, 'resultFamilies');
  for (const family of resultFamilies) {
    if (!CAESAR_ACCDB_RESULT_FAMILIES.includes(family)) throw new TypeError(`Unsupported ACCDB result family ${family}.`);
  }
  const installation = value.installationTemperature;
  const installationTemperatureK = temperatureToKelvin(installation?.value, installation?.unit);
  const conventions = normalizeConventions(value.conventions);
  const equilibriumTolerance = normalizeEquilibriumTolerance(value.equilibriumTolerance);
  const profile = {
    schema: CAESAR_ACCDB_PROFILE_SCHEMA,
    profileId: nonempty(value.profileId, 'profileId'),
    benchmarkId: nonempty(value.benchmarkId, 'benchmarkId'),
    installationTemperature: { value: Number(installation.value), unit: nonempty(installation.unit, 'installationTemperature.unit'),
      kelvin: installationTemperatureK },
    caseSelection: normalizeCaseSelection(value.caseSelection),
    nodeSelection: normalizeNodeSelection(value.nodeSelection),
    resultFamilies,
    conventions,
    equilibriumTolerance,
    tolerances: normalizeTolerances(value.tolerances),
    linearSolve: normalizeLinearSolve(value.linearSolve),
  };
  return deepFreeze(profile);
}

function normalizeNodeSelection(value) {
  const selection = String(value ?? 'ALL_OUTPUT_NODES').trim().toUpperCase();
  if (!CAESAR_ACCDB_NODE_SELECTIONS.includes(selection)) {
    throw new TypeError(`Unsupported ACCDB node selection ${selection}.`);
  }
  return selection;
}

function selectedReferenceNodeIds(elements, selection) {
  if (selection === 'ALL_OUTPUT_NODES') return null;
  return new Set(elements.flatMap((row) => [String(row.FROM_NODE), String(row.TO_NODE)]));
}

function normalizeLinearSolve(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'object' || Array.isArray(value)) throw new TypeError('linearSolve must be an object.');
  const result = {
    thermalExpansionCoefficientPerKelvin: positive(
      value.thermalExpansionCoefficientPerKelvin,
      'linearSolve.thermalExpansionCoefficientPerKelvin',
    ),
    gravityAcceleration: positive(value.gravityAcceleration, 'linearSolve.gravityAcceleration'),
    bourdonPressureEffects: normalizeBourdonPressureEffects(value.bourdonPressureEffects),
    directionalB31JTeeFlexibility: requiredBoolean(
      value.directionalB31JTeeFlexibility,
      'linearSolve.directionalB31JTeeFlexibility',
    ),
    teeNominalDiameterRelativeTolerance: nonnegative(
      value.teeNominalDiameterRelativeTolerance,
      'linearSolve.teeNominalDiameterRelativeTolerance',
    ),
    reducerCondensation: requiredBoolean(
      value.reducerCondensation,
      'linearSolve.reducerCondensation',
    ),
  };
  if (result.teeNominalDiameterRelativeTolerance > 0.01) {
    throw new TypeError('linearSolve.teeNominalDiameterRelativeTolerance must not exceed 0.01.');
  }
  return deepFreeze(result);
}

function normalizeBourdonPressureEffects(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('linearSolve.bourdonPressureEffects must be an object.');
  }
  const mode = nonempty(value.mode, 'linearSolve.bourdonPressureEffects.mode').toUpperCase();
  if (!CAESAR_BOURDON_PRESSURE_EFFECT_MODES.includes(mode)) {
    throw new TypeError(`Unsupported Bourdon pressure-effect mode ${mode}.`);
  }
  return deepFreeze({
    mode,
    source: nonempty(value.source, 'linearSolve.bourdonPressureEffects.source'),
  });
}

function normalizeRawExport(value) {
  if (!value || value.schema !== 'caesar-accdb-raw-export/v1') throw new TypeError('Unsupported ACCDB raw export.');
  if (!value.source || !/^[a-f0-9]{64}$/u.test(String(value.source.sha256))) throw new TypeError('ACCDB source SHA-256 is required.');
  const tables = {};
  for (const name of Object.keys(value.tables ?? {}).sort(compareText)) {
    const table = value.tables[name];
    if (!Array.isArray(table?.columns) || !Array.isArray(table?.rows)) throw new TypeError(`Invalid extracted table ${name}.`);
    const rows = table.rows.map((row) => Object.fromEntries(table.columns.map((column) => [column, row[column] ?? null])));
    rows.sort((left, right) => compareText(canonicalStringify(left), canonicalStringify(right)));
    tables[name] = { columns: [...table.columns], rows };
  }
  return deepFreeze({ schema: value.schema, source: { ...value.source }, provider: nonempty(value.provider, 'provider'), tables });
}

function discoverCases(tables, resultFamilies) {
  const byNumber = new Map();
  const outputTables = [...new Set(resultFamilies.flatMap((family) => FAMILY_TABLES[family]))];
  for (const tableName of outputTables) {
    for (const row of tables[tableName].rows) {
      const lcaseNumber = Number(row.LCASE_NUM);
      if (!Number.isInteger(lcaseNumber)) throw new TypeError(`${tableName} contains invalid LCASE_NUM ${String(row.LCASE_NUM)}.`);
      const descriptor = parseCaseDescriptor(lcaseNumber, row.CASE, row.LCASE_NAME);
      const prior = byNumber.get(lcaseNumber);
      if (prior && (prior.caseText !== descriptor.caseText || prior.name !== descriptor.name)) {
        throw new TypeError(`ACCDB load case ${lcaseNumber} has inconsistent descriptions across output tables.`);
      }
      byNumber.set(lcaseNumber, descriptor);
    }
  }
  return [...byNumber.values()].sort((left, right) => left.lcaseNumber - right.lcaseNumber);
}

function selectCases(discovered, selection) {
  if (selection.mode === 'ALL_AVAILABLE') {
    return discovered.map((row) => deepFreeze({ ...row, caseId: `L${row.lcaseNumber}` }));
  }
  return selection.cases.map((requested) => {
    const matches = discovered.filter((row) => row.lcaseNumber === requested.lcaseNumber);
    if (matches.length !== 1) throw new TypeError(`Case selector ${requested.caseId} matched ${matches.length} ACCDB cases.`);
    return deepFreeze({ ...matches[0], caseId: requested.caseId });
  });
}

function parseCaseDescriptor(lcaseNumber, caseValue, nameValue) {
  const caseText = nonempty(caseValue, `CASE for LCASE_NUM ${lcaseNumber}`);
  const match = /^CASE\s+\d+\s+\(([^)]+)\)\s*(.*)$/iu.exec(caseText);
  if (!match) throw new TypeError(`Cannot parse CAESAR case descriptor ${caseText}.`);
  return deepFreeze({
    lcaseNumber,
    caseText,
    caseClass: match[1].trim().toUpperCase(),
    formula: match[2].trim().toUpperCase(),
    name: String(nameValue ?? '').trim(),
  });
}

function buildModelRecord(raw, profile) {
  const tables = Object.fromEntries(MODEL_TABLES.map((name) => [name, raw.tables[name]]));
  const control = requireSingleRow(tables.INPUT_CONTROL, 'INPUT_CONTROL');
  const elements = tables.INPUT_BASIC_ELEMENT_DATA.rows;
  const bendRows = tables.INPUT_BENDS.rows;
  const referencedBends = activePointers(elements, 'BEND_PTR');
  const declaredBends = activePointers(bendRows, 'BEND_PTR');
  const missingDeclarations = referencedBends.filter((value) => !declaredBends.includes(value));
  const unreferencedDeclarations = declaredBends.filter((value) => !referencedBends.includes(value));
  if (missingDeclarations.length > 0 || unreferencedDeclarations.length > 0) {
    throw new TypeError(`BEND_PTR mismatch: missing declarations [${missingDeclarations}], unreferenced declarations [${unreferencedDeclarations}].`);
  }
  if (Number(control.NUMELT) !== elements.length) throw new TypeError(`INPUT_CONTROL NUMELT ${control.NUMELT} does not match ${elements.length} element rows.`);
  if (Number(control.NUMBEND) !== declaredBends.length) throw new TypeError(`INPUT_CONTROL NUMBEND ${control.NUMBEND} does not match ${declaredBends.length} bend pointers.`);
  const operatingTemperatures = [...new Set(elements.map((row) => Number(row.TEMP_EXP_C1)).filter(isActiveNumber))].sort((a, b) => a - b);
  const identity = {
    installationTemperatureK: profile.installationTemperature.kelvin,
    tables,
  };
  const inventory = {
    elementCount: elements.length,
    restraintRowCount: tables.INPUT_RESTRAINTS.rows.length,
    rigidPointerCount: activePointers(elements, 'RIGID_PTR').length,
    reducerPointerCount: activePointers(elements, 'REDUCER_PTR').length,
    bendPointerCount: declaredBends.length,
    bendPointers: declaredBends,
    operatingTemperatureC1Values: operatingTemperatures,
  };
  return deepFreeze({ schema: 'caesar-accdb-model-input/v1', semanticHash: semanticHash(identity), inventory,
    installationTemperatureK: profile.installationTemperature.kelvin, tables });
}

function normalizeCaseSelection(value) {
  if (!value || typeof value !== 'object') throw new TypeError('caseSelection is required.');
  const mode = nonempty(value.mode, 'caseSelection.mode').toUpperCase();
  if (mode === 'ALL_AVAILABLE') return deepFreeze({ mode, cases: [] });
  if (mode !== 'EXPLICIT') throw new TypeError(`Unsupported case selection mode ${mode}.`);
  if (!Array.isArray(value.cases) || value.cases.length === 0) throw new TypeError('Explicit case selection requires cases.');
  const cases = value.cases.map((row, index) => {
    const lcaseNumber = Number(row?.lcaseNumber);
    if (!Number.isInteger(lcaseNumber)) throw new TypeError(`caseSelection.cases[${index}].lcaseNumber must be an integer.`);
    return { caseId: nonempty(row.caseId, `caseSelection.cases[${index}].caseId`), lcaseNumber };
  });
  if (new Set(cases.map((row) => row.caseId)).size !== cases.length) throw new TypeError('Case IDs must be unique.');
  return deepFreeze({ mode, cases });
}

function normalizeConventions(value) {
  if (!value || typeof value !== 'object') throw new TypeError('ACCDB conventions are required.');
  const restraintReaction = nonempty(value.restraintReaction, 'conventions.restraintReaction');
  if (!['CAESAR_FORCE_ON_SUPPORT', 'FORCE_ON_STRUCTURE'].includes(restraintReaction)) {
    throw new TypeError(`Unsupported restraint reaction convention ${restraintReaction}.`);
  }
  return deepFreeze({ restraintReaction });
}

function normalizeEquilibriumTolerance(value) {
  if (!value || typeof value !== 'object') throw new TypeError('equilibriumTolerance is required.');
  return deepFreeze({ forceN: nonnegative(value.forceN, 'equilibriumTolerance.forceN'),
    momentNm: nonnegative(value.momentNm, 'equilibriumTolerance.momentNm') });
}

function normalizeTolerances(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Benchmark tolerances are required.');
  return deepFreeze(Object.fromEntries(Object.keys(value).sort(compareText).map((key) => [key, {
    absolute: nonnegative(value[key]?.absolute, `${key}.absolute`),
    relative: nonnegative(value[key]?.relative, `${key}.relative`),
    scaleFloor: nonnegative(value[key]?.scaleFloor, `${key}.scaleFloor`),
  }])));
}

function activePointers(rows, field) {
  return [...new Set(rows.map((row) => Number(row[field])).filter(isActiveNumber))].sort((a, b) => a - b);
}

function isActiveNumber(value) {
  return Number.isFinite(value) && value > 0;
}

function requireSingleRow(table, name) {
  if (table.rows.length !== 1) throw new TypeError(`${name} must contain exactly one row.`);
  return table.rows[0];
}

function uniqueStrings(value, field) {
  if (!Array.isArray(value) || value.length === 0) throw new TypeError(`${field} must be a non-empty array.`);
  return [...new Set(value.map((row) => nonempty(row, field).toUpperCase()))].sort(compareText);
}

function nonempty(value, field) {
  const text = String(value ?? '').trim();
  if (!text) throw new TypeError(`${field} is required.`);
  return text;
}

function nonnegative(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new TypeError(`${field} must be finite and nonnegative.`);
  return number;
}

function positive(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new TypeError(`${field} must be finite and positive.`);
  return number;
}

function requiredBoolean(value, field) {
  if (typeof value !== 'boolean') throw new TypeError(`${field} must be boolean.`);
  return value;
}

function compareText(left, right) {
  return String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0;
}
