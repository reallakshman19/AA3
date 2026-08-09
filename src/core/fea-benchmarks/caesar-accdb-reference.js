/**
 * Convert selected ACCDB output tables into common benchmark rows and nodal-balance evidence.
 * Inputs must already be table/case/profile validated; ambiguous element identities are rejected.
 */
import { deepFreeze } from '../shared-piping-model/immutable.js';
import { normalizeBenchmarkResultRows } from './qualification-contract.js';
import { convertCaesarValue } from './caesar-accdb-units.js';

const FORCE_COMPONENTS = Object.freeze([
  Object.freeze({ source: 'FX', node: 'UX' }),
  Object.freeze({ source: 'FY', node: 'UY' }),
  Object.freeze({ source: 'FZ', node: 'UZ' }),
]);
const MOMENT_COMPONENTS = Object.freeze([
  Object.freeze({ source: 'MX', node: 'RX' }),
  Object.freeze({ source: 'MY', node: 'RY' }),
  Object.freeze({ source: 'MZ', node: 'RZ' }),
]);

/** Build normalized reference rows plus independent CAESAR nodal-balance evidence. */
export function buildCaesarAccdbReferenceCase(input) {
  const {
    caseRecord, tables, resultFamilies, conventions, elementIndex, equilibriumTolerance, selectedNodeIds,
  } = input;
  const families = new Set(resultFamilies);
  const rows = [];
  if (families.has('DISPLACEMENT')) {
    appendDisplacements(rows, caseRecord, tables.OUTPUT_DISPLACEMENTS, selectedNodeIds);
  }
  if (families.has('RESTRAINT_REACTION')) appendReactions(rows, caseRecord, tables.OUTPUT_RESTRAINTS_SUMMARY, conventions);

  let incident = new Map();
  if (families.has('GLOBAL_ELEMENT_END_ACTION') || families.has('NODAL_EQUILIBRIUM')) {
    incident = appendGlobalActions(rows, caseRecord, tables.OUTPUT_GLOBAL_ELEMENT_FORCES, elementIndex,
      families.has('GLOBAL_ELEMENT_END_ACTION'));
    appendIncidentRows(rows, incident, selectedNodeIds);
  }

  const reactions = reactionMap(caseRecord, tables.OUTPUT_RESTRAINTS_SUMMARY, conventions);
  const equilibrium = families.has('NODAL_EQUILIBRIUM')
    ? buildEquilibriumEvidence(caseRecord, incident, reactions, equilibriumTolerance, selectedNodeIds)
    : null;
  const normalized = normalizeBenchmarkResultRows(rows, caseRecord.caseId);
  return deepFreeze({ rows: normalized, equilibrium });
}

function appendDisplacements(target, caseRecord, table, selectedNodeIds) {
  for (const row of caseRows(table, caseRecord.lcaseNumber)) {
    if (!nodeSelected(row.NODE, selectedNodeIds)) continue;
    for (const component of ['DX', 'DY', 'DZ']) {
      const converted = convertCaesarValue(row[component], row.DUNITS, 'LENGTH');
      target.push(resultRow('NODE', row.NODE, 'DISPLACEMENT', `U${component.slice(1)}`, converted));
    }
    for (const component of ['RX', 'RY', 'RZ']) {
      const converted = convertCaesarValue(row[component], row.RUNITS, 'ROTATION');
      target.push(resultRow('NODE', row.NODE, 'ROTATION', component, converted));
    }
  }
}

function appendReactions(target, caseRecord, table, conventions) {
  const sign = reactionSign(conventions.restraintReaction);
  for (const row of caseRows(table, caseRecord.lcaseNumber)) {
    for (const component of FORCE_COMPONENTS) {
      const converted = convertCaesarValue(Number(row[component.source]) * sign, row.FUNITS, 'FORCE');
      target.push(resultRow('NODE', row.NODE, 'FORCE', component.node, converted));
    }
    for (const component of MOMENT_COMPONENTS) {
      const converted = convertCaesarValue(Number(row[component.source]) * sign, row.MUNITS, 'MOMENT');
      target.push(resultRow('NODE', row.NODE, 'MOMENT', component.node, converted));
    }
  }
}

function appendGlobalActions(target, caseRecord, table, elementIndex, includeElementRows) {
  const incident = new Map();
  const rows = caseRows(table, caseRecord.lcaseNumber);
  const outputIdentityCounts = new Map();
  for (const row of rows) {
    const key = elementKey(row.FROM_NODE, row.TO_NODE, row.ELEMENT_NAME);
    outputIdentityCounts.set(key, (outputIdentityCounts.get(key) ?? 0) + 1);
  }
  const duplicate = [...outputIdentityCounts].find(([, count]) => count !== 1);
  if (duplicate) throw new TypeError(`Global element action identity ${duplicate[0]} occurs ${duplicate[1]} times in case ${caseRecord.caseId}.`);

  for (const row of rows) {
    const elementId = resolveElementId(row, elementIndex);
    appendEnd(target, incident, row, elementId, 'FROM', 'F', includeElementRows);
    appendEnd(target, incident, row, elementId, 'TO', 'T', includeElementRows);
  }
  return incident;
}

function appendEnd(target, incident, row, elementId, endLabel, suffix, includeElementRows) {
  const nodeId = String(endLabel === 'FROM' ? row.FROM_NODE : row.TO_NODE);
  const vector = incident.get(nodeId) ?? { FX: 0, FY: 0, FZ: 0, MX: 0, MY: 0, MZ: 0 };
  for (const component of FORCE_COMPONENTS) {
    const field = `${component.source}${suffix}`;
    const converted = convertCaesarValue(row[field], row.FUNITS, 'FORCE');
    vector[component.source] += converted.value;
    if (includeElementRows && elementId.startsWith('INPUT_ELEMENT:')) {
      target.push(resultRow('ELEMENT', elementId, `GLOBAL_END_FORCE_${endLabel}`, component.source, converted));
    }
  }
  for (const component of MOMENT_COMPONENTS) {
    const field = `${component.source}${suffix}`;
    const converted = convertCaesarValue(row[field], row.MUNITS, 'MOMENT');
    vector[component.source] += converted.value;
    if (includeElementRows && elementId.startsWith('INPUT_ELEMENT:')) {
      target.push(resultRow('ELEMENT', elementId, `GLOBAL_END_MOMENT_${endLabel}`, component.source, converted));
    }
  }
  incident.set(nodeId, vector);
}

function appendIncidentRows(target, incident, selectedNodeIds) {
  for (const [nodeId, vector] of [...incident].sort(([left], [right]) => compareText(left, right))) {
    if (!nodeSelected(nodeId, selectedNodeIds)) continue;
    for (const component of FORCE_COMPONENTS) {
      target.push({ entityKind: 'NODE', entityId: nodeId, quantity: 'INCIDENT_GLOBAL_FORCE',
        component: component.node, value: vector[component.source], unit: 'N' });
    }
    for (const component of MOMENT_COMPONENTS) {
      target.push({ entityKind: 'NODE', entityId: nodeId, quantity: 'INCIDENT_GLOBAL_MOMENT',
        component: component.node, value: vector[component.source], unit: 'N*m' });
    }
  }
}

function reactionMap(caseRecord, table, conventions) {
  const sign = reactionSign(conventions.restraintReaction);
  const result = new Map();
  for (const row of caseRows(table, caseRecord.lcaseNumber)) {
    const vector = {};
    for (const component of FORCE_COMPONENTS) {
      vector[component.source] = convertCaesarValue(Number(row[component.source]) * sign, row.FUNITS, 'FORCE').value;
    }
    for (const component of MOMENT_COMPONENTS) {
      vector[component.source] = convertCaesarValue(Number(row[component.source]) * sign, row.MUNITS, 'MOMENT').value;
    }
    result.set(String(row.NODE), vector);
  }
  return result;
}

function buildEquilibriumEvidence(caseRecord, incident, reactions, tolerance, selectedNodeIds) {
  if (/\bF[1-9]\b/u.test(caseRecord.formula)) {
    return deepFreeze({ status: 'NOT_EVALUATED', reason: 'Point-force vector terms require an external nodal-load compiler.' });
  }
  const nodeIds = [...new Set([...incident.keys(), ...reactions.keys()])]
    .filter((nodeId) => nodeSelected(nodeId, selectedNodeIds))
    .sort(compareText);
  const rows = [];
  for (const nodeId of nodeIds) {
    const action = incident.get(nodeId) ?? zeroVector();
    const reaction = reactions.get(nodeId) ?? zeroVector();
    for (const component of [...FORCE_COMPONENTS, ...MOMENT_COMPONENTS]) {
      const residual = action[component.source] - reaction[component.source];
      const limit = component.source.startsWith('F') ? tolerance.forceN : tolerance.momentNm;
      rows.push({ nodeId, component: component.node, incidentAction: action[component.source],
        supportReaction: reaction[component.source], residual, limit, status: Math.abs(residual) <= limit ? 'PASS' : 'FAIL' });
    }
  }
  const failures = rows.filter((row) => row.status === 'FAIL');
  return deepFreeze({
    status: failures.length === 0 ? 'PASS' : 'FAIL',
    counts: { total: rows.length, passed: rows.length - failures.length, failed: failures.length },
    maximumAbsoluteResidual: {
      forceN: maximum(rows.filter((row) => row.component.startsWith('U')).map((row) => Math.abs(row.residual))),
      momentNm: maximum(rows.filter((row) => row.component.startsWith('R')).map((row) => Math.abs(row.residual))),
    },
    rows,
  });
}

function nodeSelected(nodeId, selectedNodeIds) {
  return selectedNodeIds === null || selectedNodeIds.has(String(nodeId));
}

function resolveElementId(row, elementIndex) {
  const key = elementKey(row.FROM_NODE, row.TO_NODE, row.ELEMENT_NAME);
  const matches = elementIndex.get(key) ?? [];
  if (matches.length === 1) return `INPUT_ELEMENT:${matches[0]}|${key}`;
  if (matches.length === 0) return `OUTPUT_SEGMENT:${key}`;
  throw new TypeError(`Global element action ${key} maps to ${matches.length} input elements; exact identity is required.`);
}

export function buildCaesarElementIndex(inputElements) {
  const result = new Map();
  for (const row of inputElements) {
    const key = elementKey(row.FROM_NODE, row.TO_NODE, row.ELEMENT_NAME);
    const values = result.get(key) ?? [];
    values.push(String(row.ELEMENTID));
    values.sort(compareText);
    result.set(key, values);
  }
  return result;
}

function elementKey(fromNode, toNode, elementName) {
  return `${String(fromNode)}->${String(toNode)}|${String(elementName ?? '').trim()}`;
}

function caseRows(table, lcaseNumber) {
  return table.rows.filter((row) => Number(row.LCASE_NUM) === lcaseNumber);
}

function reactionSign(value) {
  if (value === 'CAESAR_FORCE_ON_SUPPORT') return -1;
  if (value === 'FORCE_ON_STRUCTURE') return 1;
  throw new TypeError(`Unsupported restraint reaction convention ${String(value)}.`);
}

function resultRow(entityKind, entityId, quantity, component, converted) {
  return { entityKind, entityId: String(entityId), quantity, component, value: converted.value, unit: converted.unit };
}

function zeroVector() {
  return { FX: 0, FY: 0, FZ: 0, MX: 0, MY: 0, MZ: 0 };
}

function maximum(values) {
  return values.length === 0 ? 0 : Math.max(...values);
}

function compareText(left, right) {
  return String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0;
}
