import { decodeCaesarRestraintCode } from './caesar-restraint-code-authority.js';

const CAESAR_UNSET = -1.0101;
const SENTINEL_TOLERANCE = 1e-3;
const UNIT_TOLERANCE = 1e-9;

/**
 * Parse CAESAR InputXML restraint rows without collapsing the exported TYPE
 * code into a direction-cosine-only restraint. This is an authority/source
 * inventory only; it does not decide nonlinear active states.
 */
export function buildInputXmlRestraintAuthorityMap(xmlText) {
  if (typeof xmlText !== 'string' || xmlText.length === 0) {
    throw new TypeError('xmlText must be a non-empty string.');
  }
  const tags = [...xmlText.matchAll(/<RESTRAINT\b[^>]*\/>/g)];
  const rows = tags.map((match, ordinal) => parseRestraint(match[0], ordinal))
    .filter((row) => row.nodeId !== null && row.typeCode !== null);

  const typeInventory = [...new Set(rows.map((row) => row.typeCode))]
    .sort((a, b) => a - b)
    .map((typeCode) => {
      const matching = rows.filter((row) => row.typeCode === typeCode);
      const decoded = decodeCaesarRestraintCode(typeCode);
      return Object.freeze({
        typeCode,
        abbreviation: decoded.abbreviation,
        family: decoded.family,
        rowCount: matching.length,
        nodeIds: Object.freeze(matching.map((row) => row.nodeId).sort(numericText)),
      });
    });

  const frictionRows = rows.filter((row) => row.coefficientOfFriction !== null
    && row.coefficientOfFriction > 0);
  const directionalRows = rows.filter((row) => row.decoded.family === 'TRANSLATIONAL_DIRECTIONAL');
  const rotationalRows = rows.filter((row) => row.decoded.family === 'ROTATIONAL_DOUBLE_ACTING');
  const snubberRows = rows.filter((row) => row.decoded.snubber === true);
  const anchorRows = rows.filter((row) => row.decoded.family === 'ANCHOR');

  return Object.freeze({
    schema: 'inputxml-restraint-authority-map/v1',
    activeRestraintRowCount: rows.length,
    activeRestraintNodeCount: new Set(rows.map((row) => row.nodeId)).size,
    typeInventory: Object.freeze(typeInventory),
    frictionSourceCount: frictionRows.length,
    frictionSources: Object.freeze(frictionRows.map(frictionContract).sort(nodeRowOrder)),
    directionalRestraints: Object.freeze(directionalRows.map(rowContract).sort(nodeRowOrder)),
    rotationalRestraints: Object.freeze(rotationalRows.map(rowContract).sort(nodeRowOrder)),
    staticSnubbers: Object.freeze(snubberRows.map(rowContract).sort(nodeRowOrder)),
    anchors: Object.freeze(anchorRows.map(rowContract).sort(nodeRowOrder)),
    warnings: Object.freeze([
      'EXPORTED_TYPE_IS_CAESAR_RESTRAINT_CODE_NOT_GENERIC_DIRECTION_CLASS',
      'DIRECTION_COSINES_MUST_NOT_REPLACE_TYPE_CODE_SEMANTICS',
      'ROTATIONAL_GAP_VALUES_USE_ANGLE_UNITS',
      'STATIC_SNUBBER_ROWS_REQUIRE_LOAD_CASE_ACTIVATION_AUTHORITY',
      'POSITIVE_GAP_FIELD_ON_A_COMPANION_ROW_IS_NOT_BY_ITSELF_TRANSLATIONAL_CONTACT_AUTHORITY',
      'THIS_MAP_DOES_NOT_AUTHORIZE_NONLINEAR_ACTIVE_STATE_SELECTION',
    ]),
  });
}

function parseRestraint(tag, ordinal) {
  const attrs = Object.fromEntries([...tag.matchAll(/([A-Z0-9_]+)="([^"]*)"/g)]
    .map((match) => [match[1], match[2]]));
  const node = optionalNumber(attrs.NODE);
  const type = optionalNumber(attrs.TYPE);
  const restraintNumber = optionalNumber(attrs.NUM);
  const typeCode = type === null ? null : Math.trunc(type);
  const decoded = typeCode === null ? null : decodeCaesarRestraintCode(typeCode);
  return Object.freeze({
    sourceId: `R${ordinal + 1}:N${node === null ? 'UNSET' : formatNode(node)}:S${restraintNumber ?? 'UNSET'}`,
    nodeId: node === null ? null : formatNode(node),
    restraintNumber,
    typeCode,
    decoded,
    stiffness: optionalNumber(attrs.STIFFNESS),
    gap: optionalNumber(attrs.GAP),
    coefficientOfFriction: optionalNumber(attrs.FRIC_COEF),
    connectingNodeId: optionalNumber(attrs.CNODE),
    direction: directionOf(attrs),
    tag: String(attrs.TAG ?? ''),
  });
}

function rowContract(row) {
  return Object.freeze({
    nodeId: row.nodeId,
    restraintNumber: row.restraintNumber,
    typeCode: row.typeCode,
    abbreviation: row.decoded.abbreviation,
    family: row.decoded.family,
    dofs: row.decoded.dofs,
    gap: row.gap,
    gapUnitClass: row.decoded.gapUnitClass,
    directionCosineAxis: row.direction,
    coefficientOfFriction: row.coefficientOfFriction,
    activationAuthority: row.decoded.activationAuthority ?? null,
    freeDirection: row.decoded.freeDirection ?? null,
    restrainedDirection: row.decoded.restrainedDirection ?? null,
    tag: row.tag,
  });
}

function frictionContract(row) {
  const base = rowContract(row);
  return Object.freeze({
    ...base,
    frictionCoefficient: row.coefficientOfFriction,
    frictionAxisUnit: row.direction,
    classification: 'FRICTION_ON_TYPED_RESTRAINT',
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

function formatNode(number) {
  return Number.isInteger(number) ? String(number) : String(Number(number));
}

function nodeRowOrder(a, b) {
  return numericText(a.nodeId, b.nodeId) || (a.restraintNumber ?? 0) - (b.restraintNumber ?? 0);
}

function numericText(a, b) {
  return Number(a) - Number(b);
}
