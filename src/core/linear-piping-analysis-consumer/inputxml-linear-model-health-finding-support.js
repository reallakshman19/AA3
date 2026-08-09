import { semanticHash } from '../shared-piping-model/canonical-json.js';

const EFFECT_RANK = Object.freeze({ PASS: 0, CONDITIONAL: 1, BLOCK: 2 });

export function modelHealthFinding(value) {
  const {
    code,
    category,
    severity,
    occurrenceKey,
    message,
    authority,
    remediation,
    capabilityEffects,
  } = value;
  const entities = value.entities === undefined ? {} : value.entities;
  const evidence = value.evidence === undefined ? {} : value.evidence;
  const normalizedEntities = normalizeEntities(entities);
  const findingId = `IMH:${code}:${semanticHash({ code, occurrenceKey, entities: normalizedEntities })}`;
  return Object.freeze({
    findingId,
    code,
    category,
    severity,
    message,
    entities: Object.freeze(normalizedEntities),
    evidence: Object.freeze(structuredClone(evidence)),
    authority,
    remediation,
    capabilityEffects: Object.freeze(capabilityEffects),
  });
}

export function modelHealthEffect(disposition, limitationCode) {
  return Object.freeze({ disposition, limitationCode: limitationCode ?? null });
}

export function addProfileEffect(effects, capabilityId, disposition) {
  if (disposition.disposition === 'IMPLEMENTED_WITH_DECLARED_APPROXIMATION') {
    effects[capabilityId] = modelHealthEffect('CONDITIONAL', disposition.limitationCode);
  } else if (['UNSUPPORTED_BY_GENERIC_SOLVER', 'NONLINEAR_OUT_OF_SCOPE', 'INVALID_SOURCE_DATA']
    .includes(disposition.disposition)) {
    effects[capabilityId] = modelHealthEffect('BLOCK', disposition.limitationCode);
  }
}

export function worstDisposition(dispositions) {
  return dispositions.reduce((worst, value) => (
    EFFECT_RANK[value] > EFFECT_RANK[worst] ? value : worst
  ), 'PASS');
}

export function aggregateDiagnosticEntities(diagnostics) {
  const nodeIds = [];
  const segmentIds = [];
  const sourceIndices = [];
  for (const row of diagnostics) {
    const data = row.data ?? {};
    if (data.nodeId !== undefined) nodeIds.push(data.nodeId);
    if (Array.isArray(data.nodeIds)) nodeIds.push(...data.nodeIds);
    if (data.segmentId !== undefined) segmentIds.push(data.segmentId);
    if (Array.isArray(data.segmentIds)) segmentIds.push(...data.segmentIds);
    if (data.elementIndex !== undefined) sourceIndices.push(data.elementIndex);
  }
  return { nodeIds, segmentIds, sourceIndices };
}

export function requireUniqueFindingIds(findings) {
  const ids = new Set();
  for (const row of findings) {
    if (ids.has(row.findingId)) {
      throw new TypeError(`InputXML model-health finding ${row.findingId} is duplicated.`);
    }
    ids.add(row.findingId);
  }
}

export function uniqueAscii(values) {
  return [...new Set((values ?? [])
    .filter((value) => value !== null && value !== undefined)
    .map(String))].sort(compareAscii);
}

export function compareFinding(left, right) {
  return compareAscii(left.findingId, right.findingId);
}

export function compareAscii(left, right) {
  const a = String(left);
  const b = String(right);
  return a < b ? -1 : a > b ? 1 : 0;
}

function normalizeEntities(entities) {
  return Object.fromEntries(Object.entries(entities).map(([key, values]) => [
    key,
    Object.freeze(uniqueAscii(values ?? [])),
  ]));
}
