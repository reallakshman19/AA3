const CAESAR_UNSET = -1.0101;
const SENTINEL_TOLERANCE = 1e-3;
const UNIT_TOLERANCE = 1e-9;

export function buildInputXmlFrictionSiteMap(xmlText) {
  if (typeof xmlText !== 'string' || xmlText.length === 0) {
    throw new TypeError('xmlText must be a non-empty string.');
  }
  const restraintTags = [...xmlText.matchAll(/<RESTRAINT\b[^>]*\/>/g)];
  const parsed = restraintTags.map((match, ordinal) => parseRestraint(match[0], ordinal));
  const active = parsed.filter((row) => row.nodeId !== null && row.typeCode !== null);
  const byNode = new Map();
  for (const row of active) {
    if (!byNode.has(row.nodeId)) byNode.set(row.nodeId, []);
    byNode.get(row.nodeId).push(row);
  }

  const frictionRows = active.filter((row) => row.coefficientOfFriction !== null && row.coefficientOfFriction > 0);
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
      sourceTypeCode: row.typeCode,
      normalUnit: row.direction,
      coefficientOfFriction: row.coefficientOfFriction,
      tag: row.tag,
      companions: Object.freeze(companions),
      positiveGapCompanions: Object.freeze(companions.filter((candidate) => candidate.gap !== null && candidate.gap > 0)),
    });
  }).sort(siteOrder);

  const frictionNodeIds = [...new Set(sites.map((row) => row.nodeId))].sort(numericText);
  const activeNodeIds = [...byNode.keys()].sort(numericText);
  const coefficientSet = [...new Set(sites.map((row) => row.coefficientOfFriction))].sort((a, b) => a - b);
  const positiveGapSiteIds = sites
    .filter((row) => row.positiveGapCompanions.length > 0)
    .map((row) => row.nodeId);

  return Object.freeze({
    schema: 'inputxml-friction-site-map/v1',
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
    positiveGapCompanionCount: sites.reduce((sum, row) => sum + row.positiveGapCompanions.length, 0),
    sites: Object.freeze(sites),
  });
}

function parseRestraint(tag, ordinal) {
  const attrs = Object.fromEntries([...tag.matchAll(/([A-Z0-9_]+)="([^"]*)"/g)].map((match) => [match[1], match[2]]));
  const node = optionalNumber(attrs.NODE);
  const type = optionalNumber(attrs.TYPE);
  const restraintNumber = optionalNumber(attrs.NUM);
  const direction = directionOf(attrs);
  return Object.freeze({
    sourceId: `R${ordinal + 1}:N${node === null ? 'UNSET' : formatNode(node)}:S${restraintNumber ?? 'UNSET'}`,
    nodeId: node === null ? null : formatNode(node),
    restraintNumber,
    typeCode: type === null ? null : String(Math.trunc(type)),
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
    typeCode: row.typeCode,
    gap: row.gap,
    direction: row.direction,
    connectingNodeId: row.connectingNodeId === null ? null : formatNode(row.connectingNodeId),
    tag: row.tag,
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
  return numericText(a.nodeId, b.nodeId) || (a.sourceRestraintNumber ?? 0) - (b.sourceRestraintNumber ?? 0);
}

function restraintOrder(a, b) {
  return (a.restraintNumber ?? 0) - (b.restraintNumber ?? 0);
}

function numericText(a, b) {
  return Number(a) - Number(b);
}
