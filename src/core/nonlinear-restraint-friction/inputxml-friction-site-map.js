import { resolveRestraintTypeMutation } from '../geometry/adapters/inputxml-restraint-type-mutation.js';
import { decodeCorrectedInputXmlRestraintType } from './caesar-restraint-code-authority.js';

const CAESAR_UNSET = -1.0101;
const SENTINEL_TOLERANCE = 1e-3;
const UNIT_TOLERANCE = 1e-9;

/**
 * Build friction-site custody from CAESAR InputXML.
 *
 * Raw TYPE is always retained as source evidence. When an explicit
 * restraintTypeMutationConfig is supplied, TYPE is corrected exactly once and
 * then classified. This keeps the legacy source-only call shape available for
 * evidence readers while preventing governed BM4_L consumers from treating raw
 * InputXML TYPE as mechanics semantics.
 */
export function buildInputXmlFrictionSiteMap(xmlText, options = {}) {
  if (typeof xmlText !== 'string' || xmlText.length === 0) {
    throw new TypeError('xmlText must be a non-empty string.');
  }
  const semanticMutationConfig = normalizeSemanticMutationConfig(
    options?.restraintTypeMutationConfig,
  );
  const restraintTags = [...xmlText.matchAll(/<RESTRAINT\b[^>]*\/>/g)];
  const parsed = restraintTags.map((match, ordinal) => parseRestraint(
    match[0],
    ordinal,
    semanticMutationConfig,
  ));
  const active = parsed.filter((row) => row.nodeId !== null && row.sourceTypeCode !== null);
  const byNode = new Map();
  for (const row of active) {
    if (!byNode.has(row.nodeId)) byNode.set(row.nodeId, []);
    byNode.get(row.nodeId).push(row);
  }

  const frictionRows = active.filter((row) => row.coefficientOfFriction !== null
    && row.coefficientOfFriction > 0);
  if (semanticMutationConfig !== null) {
    for (const row of frictionRows) {
      if (row.typeAbbreviation !== '+Y') {
        const error = new TypeError(
          `friction restraint ${row.sourceId} corrected TYPE must classify as +Y; received ${row.typeAbbreviation ?? 'UNSUPPORTED'}.`,
        );
        error.code = 'INPUTXML_FRICTION_SOURCE_SEMANTICS_MISMATCH';
        throw error;
      }
    }
  }

  const sites = frictionRows.map((row) => {
    if (!row.direction) throw new TypeError(`friction restraint ${row.sourceId} requires a direction.`);
    const companions = (byNode.get(row.nodeId) ?? [])
      .filter((candidate) => candidate.sourceId !== row.sourceId)
      .map(companionContract)
      .sort(restraintOrder);
    return Object.freeze({
      siteId: row.sourceId,
      nodeId: row.nodeId,
      sourceRestraintNumber: row.restraintNumber,
      sourceTypeCode: row.sourceTypeCode,
      correctedTypeCode: row.correctedTypeCode,
      typeAbbreviation: row.typeAbbreviation,
      typeFamily: row.typeFamily,
      mutationApplied: row.mutationApplied,
      mutationRuleId: row.mutationRuleId,
      normalUnit: row.direction,
      coefficientOfFriction: row.coefficientOfFriction,
      tag: row.tag,
      companions: Object.freeze(companions),
      positiveGapCompanions: Object.freeze(companions.filter((candidate) =>
        candidate.gap !== null && candidate.gap > 0)),
    });
  }).sort(siteOrder);

  const frictionNodeIds = [...new Set(sites.map((row) => row.nodeId))].sort(numericText);
  const activeNodeIds = [...byNode.keys()].sort(numericText);
  const coefficientSet = [...new Set(sites.map((row) => row.coefficientOfFriction))]
    .sort((a, b) => a - b);
  const positiveGapSiteIds = sites
    .filter((row) => row.positiveGapCompanions.length > 0)
    .map((row) => row.nodeId);

  return Object.freeze({
    schema: 'inputxml-friction-site-map/v1',
    sourceDomain: 'INPUTXML',
    typeSemantics: Object.freeze({
      classificationStatus: semanticMutationConfig === null
        ? 'SOURCE_ONLY_RAW_TYPE_NOT_CLASSIFIED'
        : 'CORRECTED_INPUTXML_TYPE_CLASSIFIED',
      mutationRequiredForGovernedClassification: true,
      mutationAppliedByThisMap: semanticMutationConfig !== null,
      rawTypeUsedAsMechanicsSemantics: false,
    }),
    activeRestraintRowCount: active.length,
    activeRestraintNodeCount: activeNodeIds.length,
    activeRestraintNodeIds: Object.freeze(activeNodeIds),
    frictionRestraintRowCount: sites.length,
    frictionSiteCount: sites.length,
    frictionNodeCount: frictionNodeIds.length,
    frictionNodeIds: Object.freeze(frictionNodeIds),
    positiveFrictionCoefficients: Object.freeze(coefficientSet),
    positiveGapFrictionSiteCount: positiveGapSiteIds.length,
    positiveGapFrictionNodeIds: Object.freeze(positiveGapSiteIds),
    positiveGapCompanionCount: sites.reduce((sum, row) =>
      sum + row.positiveGapCompanions.length, 0),
    sites: Object.freeze(sites),
  });
}

function parseRestraint(tag, ordinal, semanticMutationConfig) {
  const attrs = Object.fromEntries([...tag.matchAll(/([A-Z0-9_]+)="([^"]*)"/g)]
    .map((match) => [match[1], match[2]]));
  const node = optionalNumber(attrs.NODE);
  const type = optionalNumber(attrs.TYPE);
  const restraintNumber = optionalNumber(attrs.NUM);
  const direction = directionOf(attrs);
  const sourceTypeCode = type === null ? null : String(Math.trunc(type));
  let correctedTypeCode = null;
  let typeAbbreviation = null;
  let typeFamily = null;
  let mutationApplied = false;
  let mutationRuleId = null;

  if (sourceTypeCode !== null && semanticMutationConfig !== null) {
    const mutation = resolveRestraintTypeMutation(attrs.TYPE, semanticMutationConfig);
    correctedTypeCode = mutation.correctedTypeCode;
    mutationApplied = mutation.mutationApplied;
    mutationRuleId = mutation.mutationRuleId;
    const decoded = decodeCorrectedInputXmlRestraintType(correctedTypeCode);
    typeAbbreviation = decoded.abbreviation;
    typeFamily = decoded.family;
  }

  return Object.freeze({
    sourceId: `R${ordinal + 1}:N${node === null ? 'UNSET' : formatNode(node)}:S${restraintNumber ?? 'UNSET'}`,
    nodeId: node === null ? null : formatNode(node),
    restraintNumber,
    sourceTypeCode,
    correctedTypeCode,
    typeAbbreviation,
    typeFamily,
    mutationApplied,
    mutationRuleId,
    gap: optionalNumber(attrs.GAP),
    coefficientOfFriction: optionalNumber(attrs.FRIC_COEF),
    connectingNodeId: optionalNumber(attrs.CNODE),
    direction,
    tag: String(attrs.TAG ?? ''),
  });
}

function companionContract(row) {
  return Object.freeze({
    restraintNumber: row.restraintNumber,
    typeCode: row.sourceTypeCode,
    sourceTypeCode: row.sourceTypeCode,
    correctedTypeCode: row.correctedTypeCode,
    typeAbbreviation: row.typeAbbreviation,
    typeFamily: row.typeFamily,
    mutationApplied: row.mutationApplied,
    mutationRuleId: row.mutationRuleId,
    gap: row.gap,
    direction: row.direction,
    connectingNodeId: row.connectingNodeId === null ? null : formatNode(row.connectingNodeId),
    tag: row.tag,
  });
}

function normalizeSemanticMutationConfig(config) {
  if (config === undefined || config === null) return null;
  if (config?.enabled !== true || !Array.isArray(config?.rows) || config.rows.length === 0) {
    const error = new TypeError(
      'restraintTypeMutationConfig must be explicitly enabled with rows for semantic classification.',
    );
    error.code = 'INPUTXML_FRICTION_RESTRAINT_TYPE_MUTATION_CONFIG_REQUIRED';
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

function formatNode(number) {
  return Number.isInteger(number) ? String(number) : String(Number(number));
}

function siteOrder(a, b) {
  return numericText(a.nodeId, b.nodeId)
    || (a.sourceRestraintNumber ?? 0) - (b.sourceRestraintNumber ?? 0);
}

function restraintOrder(a, b) {
  return (a.restraintNumber ?? 0) - (b.restraintNumber ?? 0);
}

function numericText(a, b) {
  return Number(a) - Number(b);
}
