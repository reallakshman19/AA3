import { resolveRestraintTypeMutation } from '../geometry/adapters/inputxml-restraint-type-mutation.js';
import { decodeCorrectedInputXmlRestraintType } from './caesar-restraint-code-authority.js';

const CAESAR_UNSET = -1.0101;
const SENTINEL_TOLERANCE = 1e-3;
const UNIT_TOLERANCE = 1e-9;

/**
 * Parse CAESAR InputXML restraint rows with an explicit source-mutation config.
 * InputXML TYPE must be corrected exactly once before classification. ACCDB
 * rows do not belong on this path and must not be mutated here.
 */
export function buildInputXmlRestraintAuthorityMap(xmlText, options = {}) {
  if (typeof xmlText !== 'string' || xmlText.length === 0) {
    throw new TypeError('xmlText must be a non-empty string.');
  }
  const mutationConfig = requireMutationConfig(options.restraintTypeMutationConfig);
  const tags = [...xmlText.matchAll(/<RESTRAINT\b[^>]*\/>/g)];
  const rows = tags
    .map((match, ordinal) => parseRestraint(match[0], ordinal, mutationConfig))
    .filter((row) => row.nodeId !== null && row.sourceTypeCode !== null);

  const rawTypeInventory = inventory(rows, 'sourceTypeCode', (row) => row.sourceTypeCode);
  const correctedTypeInventory = inventory(rows, 'correctedTypeCode', (row) => row.correctedTypeCode)
    .map((entry) => {
      const decoded = decodeCorrectedInputXmlRestraintType(entry.correctedTypeCode);
      return Object.freeze({
        ...entry,
        abbreviation: decoded.abbreviation,
        family: decoded.family,
      });
    });

  const frictionRows = rows.filter((row) => row.coefficientOfFriction !== null
    && row.coefficientOfFriction > 0);
  const frictionNodes = new Set(frictionRows.map((row) => row.nodeId));
  const positiveGapRows = rows.filter((row) => row.gap !== null && row.gap > 0);
  const frictionCoupledPositiveGapRows = positiveGapRows
    .filter((row) => frictionNodes.has(row.nodeId) && !(row.coefficientOfFriction > 0));

  return Object.freeze({
    schema: 'inputxml-restraint-authority-map/v2',
    sourceDomain: 'INPUTXML',
    mutation: Object.freeze({
      required: true,
      enabled: true,
      rows: Object.freeze(mutationConfig.rows.map((row) => Object.freeze({ ...row }))),
    }),
    activeRestraintRowCount: rows.length,
    activeRestraintNodeCount: new Set(rows.map((row) => row.nodeId)).size,
    rawTypeInventory: Object.freeze(rawTypeInventory),
    correctedTypeInventory: Object.freeze(correctedTypeInventory),
    frictionSourceCount: frictionRows.length,
    frictionSources: Object.freeze(frictionRows.map(rowContract).sort(nodeRowOrder)),
    limitRows: Object.freeze(rows.filter((row) => row.decoded.abbreviation === 'LIM')
      .map(rowContract).sort(nodeRowOrder)),
    guideRows: Object.freeze(rows.filter((row) => row.decoded.abbreviation === 'GUI')
      .map(rowContract).sort(nodeRowOrder)),
    directionalRows: Object.freeze(rows.filter((row) => row.decoded.abbreviation === '+Y')
      .map(rowContract).sort(nodeRowOrder)),
    anchorRows: Object.freeze(rows.filter((row) => row.decoded.abbreviation === 'ANC')
      .map(rowContract).sort(nodeRowOrder)),
    positiveGapRows: Object.freeze(positiveGapRows.map(rowContract).sort(nodeRowOrder)),
    frictionCoupledPositiveGapRows: Object.freeze(
      frictionCoupledPositiveGapRows.map(rowContract).sort(nodeRowOrder),
    ),
    warnings: Object.freeze([
      'INPUTXML_RESTRAINT_TYPE_MUTATION_REQUIRED_BEFORE_CLASSIFICATION',
      'ACCDB_RESTRAINT_TYPES_MUST_NOT_USE_THIS_MUTATION_PATH',
      'DIRECTION_COSINES_DO_NOT_REPLACE_CORRECTED_TYPE_SEMANTICS',
      'THIS_MAP_DOES_NOT_AUTHORIZE_NONLINEAR_ACTIVE_STATE_SELECTION',
    ]),
  });
}

function parseRestraint(tag, ordinal, mutationConfig) {
  const attrs = Object.fromEntries([...tag.matchAll(/([A-Z0-9_]+)="([^"]*)"/g)]
    .map((match) => [match[1], match[2]]));
  const node = optionalNumber(attrs.NODE);
  const sourceType = optionalNumber(attrs.TYPE);
  const restraintNumber = optionalNumber(attrs.NUM);
  if (sourceType === null) {
    return Object.freeze({ nodeId: node === null ? null : formatNode(node), sourceTypeCode: null });
  }
  const mutation = resolveRestraintTypeMutation(attrs.TYPE, mutationConfig);
  const sourceTypeCode = integerTextToNumber(mutation.sourceTypeCode, 'source InputXML TYPE');
  const correctedTypeCode = integerTextToNumber(mutation.correctedTypeCode, 'corrected InputXML TYPE');
  const decoded = decodeCorrectedInputXmlRestraintType(correctedTypeCode);
  return Object.freeze({
    sourceId: `R${ordinal + 1}:N${node === null ? 'UNSET' : formatNode(node)}:S${restraintNumber ?? 'UNSET'}`,
    nodeId: node === null ? null : formatNode(node),
    restraintNumber,
    sourceTypeCode,
    correctedTypeCode,
    mutationApplied: mutation.mutationApplied,
    mutationRuleId: mutation.mutationRuleId,
    mutationLabel: mutation.mutationLabel,
    decoded,
    stiffness: optionalNumber(attrs.STIFFNESS),
    gap: optionalNumber(attrs.GAP),
    coefficientOfFriction: optionalNumber(attrs.FRIC_COEF),
    connectingNodeId: optionalNumber(attrs.CNODE),
    direction: directionOf(attrs),
    tag: String(attrs.TAG ?? ''),
  });
}

function inventory(rows, fieldName, selector) {
  return [...new Set(rows.map(selector))]
    .sort((a, b) => a - b)
    .map((value) => {
      const matching = rows.filter((row) => selector(row) === value);
      return Object.freeze({
        [fieldName]: value,
        rowCount: matching.length,
        nodeIds: Object.freeze(matching.map((row) => row.nodeId).sort(numericText)),
      });
    });
}

function rowContract(row) {
  return Object.freeze({
    nodeId: row.nodeId,
    restraintNumber: row.restraintNumber,
    sourceTypeCode: row.sourceTypeCode,
    correctedTypeCode: row.correctedTypeCode,
    mutationApplied: row.mutationApplied,
    mutationRuleId: row.mutationRuleId,
    mutationLabel: row.mutationLabel,
    abbreviation: row.decoded.abbreviation,
    family: row.decoded.family,
    gap: row.gap,
    gapUnitClass: row.decoded.gapUnitClass,
    directionCosineAxis: row.direction,
    coefficientOfFriction: row.coefficientOfFriction,
    tag: row.tag,
  });
}

function requireMutationConfig(config) {
  if (config?.enabled !== true || !Array.isArray(config?.rows) || config.rows.length === 0) {
    const error = new TypeError('InputXML restraint TYPE mutation config must be explicitly enabled with rows.');
    error.code = 'INPUTXML_RESTRAINT_TYPE_MUTATION_CONFIG_REQUIRED';
    throw error;
  }
  return Object.freeze({
    enabled: true,
    rows: Object.freeze(config.rows.map((row) => Object.freeze({
      label: String(row.label ?? ''),
      from: String(row.from),
      to: String(row.to),
    }))),
  });
}

function directionOf(attrs) {
  const raw = [optionalNumber(attrs.XCOSINE), optionalNumber(attrs.YCOSINE), optionalNumber(attrs.ZCOSINE)];
  if (raw.every((value) => value === null)) return null;
  if (raw.some((value) => value === null)) throw new TypeError('restraint direction is partially specified.');
  const magnitude = Math.hypot(...raw);
  if (!(magnitude > 0) || Math.abs(magnitude - 1) > UNIT_TOLERANCE) {
    if (raw.every((value) => value === 0)) return null;
    throw new TypeError(`restraint direction magnitude ${magnitude} is not unity.`);
  }
  return Object.freeze(raw.map((value) => Object.is(value, -0) ? 0 : value / magnitude));
}

function optionalNumber(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.abs(number - CAESAR_UNSET) < SENTINEL_TOLERANCE ? null : number;
}

function integerTextToNumber(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw new TypeError(`${label} must resolve to a non-negative integer; received ${String(value)}.`);
  }
  return number;
}

function formatNode(number) {
  return Number.isInteger(number) ? String(number) : String(Number(number));
}

function nodeRowOrder(a, b) {
  return numericText(a.nodeId, b.nodeId) || (a.restraintNumber ?? 0) - (b.restraintNumber ?? 0);
}

function numericText(a, b) {
  return Number(a) - Number(b);
}
