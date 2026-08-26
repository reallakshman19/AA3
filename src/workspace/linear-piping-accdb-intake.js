import { canonicalStringify } from '../core/shared-piping-model/canonical-json.js';
import { parseAccdbModelHealthSource } from '../core/linear-piping-analysis-consumer/accdb-source-binding.js';
import { ACCDB_MEDIA_TYPE } from '../core/linear-piping-analysis-consumer/inputxml-source-contract.js';
import { lfeaProximityOptions } from './lfea-geometry-allowance.js';
import { prepareLinearPipingInputXmlPreFlight } from './linear-piping-inputxml-prefea.js';
import { createLinearPipingSourceIntake } from './linear-piping-inputxml-intake.js';

export const LINEAR_PIPING_ACCDB_LENGTH_UNITS = Object.freeze({
  'MM': 'mm', 'MM.': 'mm', 'CM': 'cm', 'CM.': 'cm', 'M': 'm', 'M.': 'm',
  'IN': 'in', 'IN.': 'in', 'INCH': 'in', 'FT': 'ft', 'FT.': 'ft',
});

/**
 * Take a CAESAR ACCDB the whole governed pre-flight chain, so an ACCDB import
 * reaches the same Load-case, Run and Output steps an InputXML import does.
 *
 * The chain was never InputXML-specific in substance -- it consumes a model
 * health source bundle, and accdb-source-binding.js already produces one --
 * but it was InputXML-specific in custody: the intake seals a SHA-256 over
 * source *text*, and an ACCDB is a database file with no text to hash. What
 * is sealed here instead is the canonical serialization of the eleven model
 * tables actually read out of the file. That is not a stand-in for the
 * source; it is the source data, in the only form a hash can be taken over,
 * and it has a property the file itself does not: an engineer field override
 * changes it, so an overridden model gets a different identity and cannot
 * silently reuse an authorization sealed for the original.
 *
 * The bundle is parsed once, here, and injected through
 * diagnoseInputXmlLinearPreFea's existing parseSource seam -- the seam
 * accdb-source-binding.js was written for. Nothing downstream re-parses, and
 * nothing anywhere fabricates InputXML text.
 */
export function createLinearPipingAccdbIntake(tables, options = {}) {
  if (!tables || typeof tables !== 'object') {
    throw new TypeError('An ACCDB table set is required.');
  }
  const fileName = requireText(options.fileName, 'fileName');
  const content = canonicalStringify(modelTablePayload(tables));
  // The unit the pipeline is handed, not the unit the file is written in.
  // accdb-to-canonical-geometry.js converts every length as it reads the
  // tables and emits geometry in metres, so metres is what the normalization
  // profile downstream must authorize. The file's own declared unit is
  // resolved anyway -- it has to be a unit this project recognizes for the
  // conversion to have meant anything -- and is recorded as the authority
  // evidence rather than silently dropped.
  const declaredLengthUnit = resolveAccdbLengthUnit(tables);
  return createLinearPipingSourceIntake({
    fileName,
    content,
    mediaType: ACCDB_MEDIA_TYPE,
    sourceUnit: 'm',
    sourceIdPrefix: 'LFEA-ACCDB',
    unitAuthority: {
      declared: true,
      authority: 'CAESAR_ACCDB_DECLARED_LENGTH_UNIT',
      evidence: `INPUT_UNITS.LENGTH declares ${declaredLengthUnit}; the ACCDB adapter converted every length to metres on read, so the geometry handed downstream is in metres.`,
    },
    requestedProfileId: options.requestedProfileId,
    requestedCaseIds: options.requestedCaseIds,
  });
}

/**
 * Run the existing governed diagnostics/preparation chain for an ACCDB
 * intake. The already-parsed bundle is injected rather than re-derived, so
 * the model the pre-flight judges is byte-for-byte the model the panel showed.
 */
export function prepareLinearPipingAccdbPreFlight(intake, sourceBundle, options = {}) {
  if (!sourceBundle || sourceBundle.sourceKind !== 'ACCDB') {
    throw new TypeError('prepareLinearPipingAccdbPreFlight requires the parsed ACCDB source bundle.');
  }
  return prepareLinearPipingInputXmlPreFlight(intake, {
    ...options,
    diagnosticsOptions: {
      // The same allowance the panel's own verdict is read under: if these
      // disagreed, a model would pass the panel and fail the pre-flight (or
      // the reverse) with no way for the engineer to tell which was right.
      proximityOptions: lfeaProximityOptions(options.diagnosticsOptions?.proximityOptions ?? {}),
      ...(options.diagnosticsOptions ?? {}),
      parseSource: () => sourceBundle,
    },
  });
}

/** Parse the tables and seal the intake in one step, as the panel needs both. */
export function createLinearPipingAccdbSession(tables, options = {}) {
  const fileName = requireText(options.fileName, 'fileName');
  const sourceBundle = parseAccdbModelHealthSource(tables, {
    source: options.source ?? `accdb-${fileName}`,
    fileName,
  });
  const intake = createLinearPipingAccdbIntake(tables, options);
  return Object.freeze({ sourceBundle, intake });
}

/**
 * The exact model tables, and only those: the eleven INPUT_* tables the
 * adapter reads. Serializing the reader's own bookkeeping (column order,
 * read logs) would make the identity depend on how the file was read rather
 * than on what it contains.
 */
function modelTablePayload(tables) {
  const payload = {};
  for (const name of Object.keys(tables).sort()) {
    const table = tables[name];
    if (!table || !Array.isArray(table.rows)) continue;
    payload[name] = table.rows;
  }
  return payload;
}

function resolveAccdbLengthUnit(tables) {
  const rows = tables.INPUT_UNITS?.rows ?? [];
  if (rows.length !== 1) {
    throw new TypeError(`INPUT_UNITS must declare exactly one row; found ${rows.length}.`);
  }
  const raw = String(rows[0].LENGTH ?? '').trim().toUpperCase();
  const unit = LINEAR_PIPING_ACCDB_LENGTH_UNITS[raw] ?? null;
  if (unit === null) {
    // No guessed default: a wrong length unit rescales the entire model.
    throw new TypeError(`Unsupported ACCDB INPUT_UNITS.LENGTH token ${JSON.stringify(rows[0].LENGTH ?? null)}.`);
  }
  return unit;
}

function requireText(value, field) {
  const text = value === null || value === undefined ? '' : String(value).trim();
  if (!text) throw new TypeError(`An ACCDB intake requires ${field}.`);
  return text;
}
