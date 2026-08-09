#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCKED_SHA = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const SENTINEL_CUTOFF = 0;

function args(argv) {
  const out = new Map();
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i]?.startsWith('--') || argv[i + 1] === undefined) throw new TypeError(`Invalid argument near ${String(argv[i])}`);
    out.set(argv[i], argv[i + 1]);
  }
  for (const key of ['--raw', '--out', '--summary']) if (!out.has(key)) throw new TypeError(`Missing ${key}`);
  return Object.fromEntries([...out].map(([k, v]) => [k.slice(2), resolve(v)]));
}
function num(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function text(value) { return String(value ?? '').trim(); }
function table(raw, name) {
  const t = raw.tables?.[name];
  if (!t || !Array.isArray(t.rows)) throw new TypeError(`Missing table ${name}`);
  return t.rows;
}
function activePointer(value) { const n = num(value); return n !== null && n > 0; }
function activeScalar(value) { const n = num(value); return n !== null && n > SENTINEL_CUTOFF; }
function nonzeroActiveScalar(value, tol = 1e-12) { const n = num(value); return n !== null && n > SENTINEL_CUTOFF && Math.abs(n) > tol; }
function sha256Text(value) { return createHash('sha256').update(value, 'utf8').digest('hex'); }
function norm3(v) { return Math.hypot(v[0], v[1], v[2]); }
function angleDegrees(a, b) {
  const na = norm3(a); const nb = norm3(b);
  if (!(na > 0 && nb > 0)) return 0;
  const dot = a.reduce((sum, value, i) => sum + value * b[i], 0) / (na * nb);
  return Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI;
}

const input = args(process.argv.slice(2));
const rawText = readFileSync(input.raw, 'utf8').replace(/^\uFEFF/u, '');
const raw = JSON.parse(rawText);
if (raw?.source?.sha256 !== LOCKED_SHA) throw new Error(`Locked ACCDB mismatch: ${String(raw?.source?.sha256)}`);

const basic = table(raw, 'INPUT_BASIC_ELEMENT_DATA');
const restraints = table(raw, 'INPUT_RESTRAINTS');
const forces = table(raw, 'INPUT_FORCMNT');
const coords = table(raw, 'INPUT_NODAL_COORDINATES');
const offsets = table(raw, 'INPUT_OFFSETS');
const outDisp = table(raw, 'OUTPUT_DISPLACEMENTS');
const outForce = table(raw, 'OUTPUT_GLOBAL_ELEMENT_FORCES');
const outRest = table(raw, 'OUTPUT_RESTRAINTS_SUMMARY');

const pointerFields = ['BEND_PTR','RIGID_PTR','EXPJ_PTR','REST_PTR','DISP_PTR','FORCMNT_PTR','ULOAD_PTR','WLOAD_PTR','EOFF_PTR','INT_PTR','HGR_PTR','NOZ_PTR','REDUCER_PTR','FLANGE_PTR'];
const pointerCounts = Object.fromEntries(pointerFields.map((field) => [field, basic.filter((row) => activePointer(row[field])).length]));

const restraintRows = restraints.map((row) => ({
  restPtr: num(row.REST_PTR), node: text(row.NODE_NUM), typeId: num(row.RES_TYPEID),
  rawStiffness: num(row.STIFFNESS), rawGap: num(row.GAP), rawFriction: num(row.FRIC_COEF), rawCnode: num(row.CNODE),
  explicitPositiveStiffness: activeScalar(row.STIFFNESS) ? num(row.STIFFNESS) : null,
  explicitPositiveGap: activeScalar(row.GAP) ? num(row.GAP) : null,
  exportedPositiveFriction: activeScalar(row.FRIC_COEF) ? num(row.FRIC_COEF) : null,
  activeCnode: activeScalar(row.CNODE) ? text(row.CNODE) : null,
  direction: [num(row.XCOSINE), num(row.YCOSINE), num(row.ZCOSINE)], tag: text(row.RES_TAG),
}));
const explicitStiffness = restraintRows.filter((row) => row.explicitPositiveStiffness !== null);
const explicitGaps = restraintRows.filter((row) => row.explicitPositiveGap !== null);
const exportedPositiveFriction = restraintRows.filter((row) => row.exportedPositiveFriction !== null);
const activeCnodes = restraintRows.filter((row) => row.activeCnode !== null);
const restraintTypes = [...new Set(restraintRows.map((row) => row.typeId))].sort((a,b)=>(a ?? 0)-(b ?? 0));

const forceRows = forces.map((row) => ({
  pointer: num(row.FORCMNT_PTR), number: num(row.FORCMNT_NUM), node: text(row.NODE_NUM), vector: num(row.VECTOR_NUM),
  fx: num(row.FX), fy: num(row.FY), fz: num(row.FZ), mx: num(row.MX), my: num(row.MY), mz: num(row.MZ),
}));
const nonzeroForceRows = forceRows.filter((row) => ['fx','fy','fz','mx','my','mz'].some((key) => Math.abs(row[key] ?? 0) > 1e-12));
const nonzeroForceVectors = [...new Set(nonzeroForceRows.map((row) => row.vector).filter(Number.isInteger))].sort((a,b)=>a-b);

const caseMap = new Map();
for (const [name, rows] of [['OUTPUT_DISPLACEMENTS', outDisp], ['OUTPUT_GLOBAL_ELEMENT_FORCES', outForce], ['OUTPUT_RESTRAINTS_SUMMARY', outRest]]) {
  for (const row of rows) {
    const n = num(row.LCASE_NUM);
    if (!Number.isInteger(n)) continue;
    const rec = { lcaseNumber: n, caseText: text(row.CASE), name: text(row.LCASE_NAME) };
    const prior = caseMap.get(n);
    if (prior && (prior.caseText !== rec.caseText || prior.name !== rec.name)) throw new Error(`Inconsistent output case ${n} across ${name}`);
    caseMap.set(n, rec);
  }
}
const cases = [...caseMap.values()].sort((a,b)=>a.lcaseNumber-b.lcaseNumber).map((row) => {
  const match = /^CASE\s+\d+\s+\(([^)]+)\)\s*(.*)$/iu.exec(row.caseText);
  const formula = match ? match[2].trim().toUpperCase() : '';
  const forceSets = [...formula.matchAll(/(?:^|[^A-Z0-9])F([1-9])(?:$|[^A-Z0-9])/gu)].map((m) => Number(m[1]));
  return { ...row, caseClass: match ? match[1].trim().toUpperCase() : '', formula, forceSets };
});
const selected = cases.filter((row) => row.lcaseNumber === 19 || row.lcaseNumber === 20);
const primitiveLike = cases.filter((row) => /^(W|WNC|WW|P[1-9]|T[1-9]|F[1-9]|D[1-9]|U[1-3])$/u.test(row.formula));

const modulusValues = [...new Set(basic.map((row) => num(row.MODULUS)))];
const hot1Values = [...new Set(basic.map((row) => num(row.HOT_MOD1)))];
const materialNames = [...new Set(basic.map((row) => text(row.MATERIAL_NAME)))];
const materialNumbers = [...new Set(basic.map((row) => num(row.MATERIAL_NUM)))];

const coordByElement = new Map(coords.map((row) => [`${text(row.FROM_NODE)}->${text(row.TO_NODE)}`, row]));
const geometryRows = [];
for (const row of basic) {
  const key = `${text(row.FROM_NODE)}->${text(row.TO_NODE)}`;
  const c = coordByElement.get(key);
  if (!c) {
    geometryRows.push({ elementId: text(row.ELEMENTID), issue: 'MISSING_COORDINATE_ROW' });
    continue;
  }
  const delta = [num(row.DELTA_X), num(row.DELTA_Y), num(row.DELTA_Z)];
  const coordinateDifference = [
    num(c.TO_NODE_X) - num(c.FROM_NODE_X),
    num(c.TO_NODE_Y) - num(c.FROM_NODE_Y),
    num(c.TO_NODE_Z) - num(c.FROM_NODE_Z),
  ];
  const deltaLength = norm3(delta);
  const coordinateLength = norm3(coordinateDifference);
  const residual = coordinateDifference.map((value, i) => value - delta[i]);
  const maxAbsResidualMm = Math.max(...residual.map(Math.abs));
  const relativeLengthDifference = deltaLength > 0 ? Math.abs(coordinateLength - deltaLength) / deltaLength : 0;
  const directionDifferenceDegrees = angleDegrees(delta, coordinateDifference);
  geometryRows.push({
    elementId: text(row.ELEMENTID), fromNode: text(row.FROM_NODE), toNode: text(row.TO_NODE),
    deltaMm: delta, coordinateDifferenceMm: coordinateDifference, residualMm: residual,
    deltaLengthMm: deltaLength, coordinateLengthMm: coordinateLength,
    maxAbsResidualMm, relativeLengthDifference, directionDifferenceDegrees,
  });
}
const geometryMismatches = geometryRows.filter((row) => row.issue || row.maxAbsResidualMm > 1e-6);
const significantLengthMismatches = geometryRows.filter((row) => (row.relativeLengthDifference ?? 0) > 1e-3);
const significantDirectionMismatches = geometryRows.filter((row) => (row.directionDifferenceDegrees ?? 0) > 1e-3);

const audit = {
  schema: 'lfea-m047-i027-foundational-audit/v2', issueId: 'M047', iterationId: 'M047-I027',
  sourceAccdbSha256: raw.source.sha256, rawExportSha256: sha256Text(rawText), sourceElementCount: basic.length,
  pointerCounts,
  restraints: {
    rowCount: restraintRows.length, typeIds: restraintTypes,
    explicitPositiveStiffnessCount: explicitStiffness.length,
    explicitPositiveGapCount: explicitGaps.length,
    exportedPositiveFrictionCount: exportedPositiveFriction.length,
    activeCnodeCount: activeCnodes.length,
    sentinelRule: 'Numeric values <= 0 in STIFFNESS/GAP/CNODE are inactive export sentinels for this audit; FRIC_COEF is retained as exported input evidence but L19/L20 case authority explicitly sets friction to zero.',
    rows: restraintRows,
  },
  forceMoments: {
    rowCount: forceRows.length, nonzeroRowCount: nonzeroForceRows.length, nonzeroVectorNumbers: nonzeroForceVectors,
    l19l20ForceSets: selected.map((row) => ({ lcaseNumber: row.lcaseNumber, formula: row.formula, forceSets: row.forceSets })),
  },
  offsets: { tableRowCount: offsets.length, activeElementPointerCount: pointerCounts.EOFF_PTR },
  material: {
    materialNames, materialNumbers, modulusKPaValues: modulusValues, hotMod1KPaValues: hot1Values,
    modulusEqualsHotMod1: modulusValues.length === 1 && hot1Values.length === 1 && modulusValues[0] === hot1Values[0],
  },
  outputCases: { count: cases.length, cases, primitiveLike },
  geometry: {
    comparisonRule: 'INPUT_BASIC_ELEMENT_DATA DELTA_* versus subtraction of exported INPUT_NODAL_COORDINATES; differences are reported as export/authority precision evidence, not automatically treated as model errors.',
    mismatchCount: geometryMismatches.length,
    significantRelativeLengthMismatchCount: significantLengthMismatches.length,
    significantDirectionMismatchCount: significantDirectionMismatches.length,
    maxRelativeLengthDifference: Math.max(...geometryRows.map((row) => row.relativeLengthDifference ?? 0)),
    maxDirectionDifferenceDegrees: Math.max(...geometryRows.map((row) => row.directionDifferenceDegrees ?? 0)),
    significantLengthMismatches,
    significantDirectionMismatches,
    rows: geometryRows,
  },
  conclusions: [],
};

if (explicitStiffness.length) audit.conclusions.push('EXPLICIT_RESTRAINT_STIFFNESS_PRESENT');
else audit.conclusions.push('RESTRAINT_STIFFNESS_BLANK_OR_SENTINEL_USE_CAESAR_DEFAULT_1E13_FROM_OVERALL_CONFIGURATION');
if (explicitGaps.length || activeCnodes.length) audit.conclusions.push('ACTIVE_GAP_OR_CNODE_PRESENT');
else audit.conclusions.push('NO_ACTIVE_GAP_OR_CNODE_AFTER_SENTINEL_CLASSIFICATION');
audit.conclusions.push('L19_L20_FRICTION_IS_ZERO_BY_CASE_SPECIFIC_AUTHORITY_EXPORTED_MU03_NOT_ACTIVE_FOR_QUALIFICATION');
if (selected.some((row) => row.forceSets.length)) audit.conclusions.push('L19_OR_L20_CONTAINS_FORCE_SET');
else audit.conclusions.push('L19_L20_DO_NOT_REFERENCE_F1_F9');
if (primitiveLike.length) audit.conclusions.push('PRIMITIVE_LIKE_CAESAR_OUTPUT_CASES_AVAILABLE');
else audit.conclusions.push('NO_PRIMITIVE_LIKE_CAESAR_OUTPUT_CASES_EXPORTED');
if (audit.material.modulusEqualsHotMod1) audit.conclusions.push('LOCKED_ACCDB_EC_EQUALS_EH1_NUMERICALLY_I016_NEUTRAL');
else audit.conclusions.push('LOCKED_ACCDB_EC_DIFFERS_FROM_EH1');
if (significantLengthMismatches.length || significantDirectionMismatches.length) audit.conclusions.push('DELTA_VS_ABSOLUTE_COORDINATE_AUTHORITY_REQUIRES_MECHANIC_SPECIFIC_REVIEW');
else audit.conclusions.push('DELTA_VS_ABSOLUTE_COORDINATE_DIFFERENCES_NUMERICALLY_SMALL');

writeFileSync(input.out, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
const lines = [
  '# M047 I027 foundational ACCDB audit', '',
  `- ACCDB: \`${audit.sourceAccdbSha256}\``,
  `- source elements: ${audit.sourceElementCount}`,
  `- active pointers: ${Object.entries(pointerCounts).filter(([,v])=>v>0).map(([k,v])=>`${k}=${v}`).join(', ')}`,
  `- restraint rows: ${restraintRows.length}; positive explicit stiffness: ${explicitStiffness.length}; positive gap: ${explicitGaps.length}; active CNode: ${activeCnodes.length}`,
  `- exported positive friction rows: ${exportedPositiveFriction.length}; L19/L20 active friction: 0 by job/case authority`,
  `- force/moment rows: ${forceRows.length}; nonzero vectors: ${nonzeroForceVectors.join(', ') || 'none'}; L19/L20 F-set participation: ${selected.map((r)=>`L${r.lcaseNumber}=${r.forceSets.join(',')||'none'}`).join('; ')}`,
  `- output cases discovered: ${cases.length}; primitive-like: ${primitiveLike.map((r)=>`L${r.lcaseNumber}:${r.formula}`).join(', ') || 'none'}`,
  `- active EOFF_PTR: ${pointerCounts.EOFF_PTR}; INPUT_OFFSETS rows: ${offsets.length}`,
  `- EC MODULUS: ${modulusValues.join(', ')} kPa; EH1 HOT_MOD1: ${hot1Values.join(', ')} kPa; equal: ${audit.material.modulusEqualsHotMod1}`,
  `- DELTA/coordinate raw mismatches: ${geometryMismatches.length}; >0.1% length: ${significantLengthMismatches.length}; >0.001 deg direction: ${significantDirectionMismatches.length}`,
  '', '## Conclusions', ...audit.conclusions.map((x)=>`- ${x}`), '',
];
writeFileSync(input.summary, `${lines.join('\n')}\n`, 'utf8');
console.log(JSON.stringify({ conclusions: audit.conclusions }));
