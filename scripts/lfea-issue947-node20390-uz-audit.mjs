#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const args = parseArgs(process.argv.slice(2));
if (!args.package) throw new TypeError('--package is required');
if (!args.actual) throw new TypeError('--actual is required');
const outPath = args.out ?? '.work/bm4nl-node20390-uz-audit.json';
const settingsPath = args.settings
  ?? 'benchmarks/LFEA/CAESAR_ACCDB/bm4nl-caesar-settings.authority.json';

const pkg = readJson(args.package);
const actual = readJson(args.actual);
const settings = readJson(settingsPath);
const referenceRows = pkg.references?.L19?.rows;
const actualRows = actual.cases?.L19?.rows;
assert.ok(Array.isArray(referenceRows), 'package L19 reference rows are required');
assert.ok(Array.isArray(actualRows), 'actual L19 rows are required');

const sourceRows = pkg.model?.tables?.INPUT_BASIC_ELEMENT_DATA?.rows;
const restraintRows = pkg.model?.tables?.INPUT_RESTRAINTS?.rows;
const unitRows = pkg.model?.tables?.INPUT_UNITS?.rows;
assert.ok(Array.isArray(sourceRows) && Array.isArray(restraintRows) && Array.isArray(unitRows));
assert.equal(unitRows.length, 1, 'BM4_NL must have one INPUT_UNITS row');
const units = unitRows[0];
assert.equal(String(units.TRANS).trim().toUpperCase(), 'N./CM.');
const nativeTransStiffnessToNPerM = 100;
const defaultTransNative = Number(settings.overall.settings.DEFAULT_TRANS_RESTRAINT_STIFF);
assert.equal(defaultTransNative, 1e12);
const defaultTransNPerM = defaultTransNative * nativeTransStiffnessToNPerM;

const nodeId = '20390';
const nodeRestraints = restraintRows
  .filter((row) => String(row.NODE_NUM) === nodeId)
  .sort((a, b) => Number(a.RES_TYPEID) - Number(b.RES_TYPEID));
assert.deepEqual(nodeRestraints.map((row) => Number(row.RES_TYPEID)), [3, 8, 9]);
assert.ok(nodeRestraints.every((row) => !(Number(row.STIFFNESS) > 0)), 'node 20390 should use default restraint stiffness');
const yRestraint = nodeRestraints.find((row) => Number(row.RES_TYPEID) === 3);
assert.ok(Math.abs(Number(yRestraint.FRIC_COEF) - 0.3) < 1e-6);
assert.equal(settings.effective.L19.COEFFICIENT_OF_FRICTION_MU, 0);
assert.equal(settings.effective.L20.COEFFICIENT_OF_FRICTION_MU, 0);

const e22 = sourceElement(sourceRows, 22);
const e23 = sourceElement(sourceRows, 23);
assert.equal(String(e22.TO_NODE), nodeId);
assert.equal(String(e23.FROM_NODE), nodeId);
for (const row of [e22, e23]) {
  assert.equal(Number(row.BEND_PTR), 0);
  assert.equal(Number(row.RIGID_PTR), 0);
  assert.equal(Number(row.REDUCER_PTR), 0);
}
assert.ok(Math.abs(Number(e22.DELTA_Y)) < 1e-9 && Math.abs(Number(e22.DELTA_Z)) < 1e-9);
assert.ok(Math.abs(Number(e23.DELTA_Y)) < 1e-9 && Math.abs(Number(e23.DELTA_Z)) < 1e-9);

const section = sectionAndMaterial(e22);
const e23Section = sectionAndMaterial(e23);
for (const key of ['outerDiameterM', 'wallThicknessM', 'elasticModulusPa', 'poissonRatio']) {
  assert.ok(relativeDifference(section[key], e23Section[key]) < 1e-12, `E22/E23 ${key} mismatch`);
}
const kappa = 0.5;
const L22 = elementLengthM(e22);
const L23 = elementLengthM(e23);
const b22 = timoshenkoBending(section, L22, kappa);
const b23 = timoshenkoBending(section, L23, kappa);

const caesarKinematics = kinematics(referenceRows);
const lfeaKinematics = kinematics(actualRows);
const d22Caesar = vectorFor(e22, caesarKinematics);
const d23Caesar = vectorFor(e23, caesarKinematics);
const d22Lfea = vectorFor(e22, lfeaKinematics);
const d23Lfea = vectorFor(e23, lfeaKinematics);
const q22CaesarReconstructed = multiply(b22.matrix, d22Caesar);
const q23CaesarReconstructed = multiply(b23.matrix, d23Caesar);
const q22LfeaReconstructed = multiply(b22.matrix, d22Lfea);
const q23LfeaReconstructed = multiply(b23.matrix, d23Lfea);

const source22Id = sourceResultElementId(e22);
const source23Id = sourceResultElementId(e23);
const caesarActionWitnesses = [
  actionWitness(referenceRows, source22Id, 'GLOBAL_END_FORCE_FROM', 'FZ', q22CaesarReconstructed[0], 50),
  actionWitness(referenceRows, source22Id, 'GLOBAL_END_MOMENT_FROM', 'MY', q22CaesarReconstructed[1], 5),
  actionWitness(referenceRows, source22Id, 'GLOBAL_END_FORCE_TO', 'FZ', q22CaesarReconstructed[2], 50),
  actionWitness(referenceRows, source22Id, 'GLOBAL_END_MOMENT_TO', 'MY', q22CaesarReconstructed[3], 5),
  actionWitness(referenceRows, source23Id, 'GLOBAL_END_FORCE_FROM', 'FZ', q23CaesarReconstructed[0], 50),
  actionWitness(referenceRows, source23Id, 'GLOBAL_END_MOMENT_FROM', 'MY', q23CaesarReconstructed[1], 5),
  actionWitness(referenceRows, source23Id, 'GLOBAL_END_FORCE_TO', 'FZ', q23CaesarReconstructed[2], 50),
  actionWitness(referenceRows, source23Id, 'GLOBAL_END_MOMENT_TO', 'MY', q23CaesarReconstructed[3], 5),
];
const maxCaesarReconstructionNormalizedError = Math.max(
  ...caesarActionWitnesses.map((entry) => entry.normalizedError),
);
assert.ok(maxCaesarReconstructionNormalizedError <= 0.1, 'independent E22/E23 CAESAR-kinematic reconstruction must pass existing 10% action gate');

const caesarReaction = nodeValue(referenceRows, nodeId, 'FORCE', 'UZ');
const lfeaReaction = nodeValue(actualRows, nodeId, 'FORCE', 'UZ');
const caesarIncident = nodeValue(referenceRows, nodeId, 'INCIDENT_GLOBAL_FORCE', 'UZ');
const lfeaIncident = nodeValue(actualRows, nodeId, 'INCIDENT_GLOBAL_FORCE', 'UZ');
const caesarSourceIncident = elementValue(referenceRows, source22Id, 'GLOBAL_END_FORCE_TO', 'FZ')
  + elementValue(referenceRows, source23Id, 'GLOBAL_END_FORCE_FROM', 'FZ');
const lfeaSourceIncident = elementValue(actualRows, source22Id, 'GLOBAL_END_FORCE_TO', 'FZ')
  + elementValue(actualRows, source23Id, 'GLOBAL_END_FORCE_FROM', 'FZ');

const independentCaesarReaction = q22CaesarReconstructed[2] + q23CaesarReconstructed[0];
const independentLfeaReaction = q22LfeaReconstructed[2] + q23LfeaReconstructed[0];
const reactionDelta = lfeaReaction - caesarReaction;
const independentReactionDelta = independentLfeaReaction - independentCaesarReaction;

const sensitivities = reactionSensitivities(b22.matrix, b23.matrix);
const dofDeltas = {
  '20350:UZ': lfeaKinematics.get('20350:UZ') - caesarKinematics.get('20350:UZ'),
  '20350:RY': lfeaKinematics.get('20350:RY') - caesarKinematics.get('20350:RY'),
  '20390:UZ': lfeaKinematics.get('20390:UZ') - caesarKinematics.get('20390:UZ'),
  '20390:RY': lfeaKinematics.get('20390:RY') - caesarKinematics.get('20390:RY'),
  '20440:UZ': lfeaKinematics.get('20440:UZ') - caesarKinematics.get('20440:UZ'),
  '20440:RY': lfeaKinematics.get('20440:RY') - caesarKinematics.get('20440:RY'),
};
const contributions = Object.entries(sensitivities).map(([dof, sensitivityNPerUnit]) => ({
  dof,
  sensitivityNPerUnit,
  delta: dofDeltas[dof],
  reactionContributionN: sensitivityNPerUnit * dofDeltas[dof],
}));
const summedKinematicContributionN = contributions.reduce((sum, entry) => sum + entry.reactionContributionN, 0);
const dominant = [...contributions].sort((a, b) => Math.abs(b.reactionContributionN) - Math.abs(a.reactionContributionN));

const pipeAxialUpperNPerM = section.elasticModulusPa * section.areaM2 / L22
  + section.elasticModulusPa * section.areaM2 / L23;
const pipeToSupportUpperRatio = pipeAxialUpperNPerM / defaultTransNPerM;
const caesarSupportComplianceM = Math.abs(caesarReaction) / defaultTransNPerM;
const conservativeReactionShiftUpperN = Math.abs(caesarReaction) * pipeToSupportUpperRatio;

const result = {
  check: 'lfea-issue947-node20390-uz-audit',
  status: 'PASS',
  nodeId,
  sourceElements: [22, 23],
  restraintCustody: {
    exportedRestraintCodes: nodeRestraints.map((row) => ({
      code: Number(row.RES_TYPEID),
      xCosine: Number(row.XCOSINE),
      yCosine: Number(row.YCOSINE),
      zCosine: Number(row.ZCOSINE),
      exportedStiffness: Number(row.STIFFNESS),
      exportedMu: Number(row.FRIC_COEF),
    })),
    inputUnitsTrans: units.TRANS,
    defaultTransNative,
    defaultTransNPerM,
    modelInputMu: settings.modelInput.settings.COEFFICIENT_OF_FRICTION_MU,
    L19EffectiveMu: settings.effective.L19.COEFFICIENT_OF_FRICTION_MU,
    L20EffectiveMu: settings.effective.L20.COEFFICIENT_OF_FRICTION_MU,
  },
  independentStraightBending: {
    kappa,
    E22: { lengthM: L22, phi: b22.phi, reconstructed: q22CaesarReconstructed },
    E23: { lengthM: L23, phi: b23.phi, reconstructed: q23CaesarReconstructed },
    witnesses: caesarActionWitnesses,
    maxNormalizedError: maxCaesarReconstructionNormalizedError,
    existingActionGate: 0.1,
    disposition: 'LOCAL_E22_E23_FZ_MY_CONSTITUTIVE_CHANNEL_PASSES_UNDER_CAESAR_KINEMATICS',
  },
  reactionClosure: {
    caesarReactionN: caesarReaction,
    caesarIncidentN: caesarIncident,
    caesarSourceIncidentN: caesarSourceIncident,
    independentCaesarReactionN: independentCaesarReaction,
    lfeaReactionN: lfeaReaction,
    lfeaIncidentN: lfeaIncident,
    lfeaSourceIncidentN: lfeaSourceIncident,
    independentLfeaReactionN: independentLfeaReaction,
    reactionDeltaN: reactionDelta,
    independentReactionDeltaN: independentReactionDelta,
  },
  kinematicDecomposition: {
    contributions,
    summedKinematicContributionN,
    dominant,
    closureErrorN: summedKinematicContributionN - independentReactionDelta,
  },
  finiteRestraintStiffnessFalsification: {
    pipeAxialUpperNPerM,
    supportNPerM: defaultTransNPerM,
    pipeToSupportUpperRatio,
    caesarSupportComplianceM,
    conservativeReactionShiftUpperN,
    observedReactionDifferenceN: Math.abs(reactionDelta),
    disposition: conservativeReactionShiftUpperN < Math.abs(reactionDelta) * 0.001
      ? 'FINITE_DEFAULT_RESTRAINT_COMPLIANCE_FALSIFIED_AS_NODE20390_UZ_CAUSE'
      : 'NOT_FALSIFIED',
  },
  classification: 'NODE20390_UZ_MISS_IS_GLOBAL_KINEMATIC_LOAD_PATH_NOT_LOCAL_STRAIGHT_BEAM_OR_FRICTION',
};

assert.ok(Math.abs(caesarReaction - caesarIncident) < 1e-3);
assert.ok(Math.abs(caesarReaction - caesarSourceIncident) < 1e-3);
assert.ok(Math.abs(caesarReaction - independentCaesarReaction) < 0.01);
assert.ok(Math.abs(lfeaReaction - lfeaIncident) < 1e-3);
assert.ok(Math.abs(lfeaReaction - lfeaSourceIncident) < 1e-3);
assert.ok(Math.abs(independentReactionDelta - summedKinematicContributionN) < 1e-8);
assert.equal(result.finiteRestraintStiffnessFalsification.disposition, 'FINITE_DEFAULT_RESTRAINT_COMPLIANCE_FALSIFIED_AS_NODE20390_UZ_CAUSE');

fs.mkdirSync('.work', { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));

function sourceElement(rows, id) {
  const row = rows.find((entry) => Number(entry.ELEMENTID) === id);
  if (!row) throw new TypeError(`Missing source element ${id}`);
  return row;
}

function sourceResultElementId(row) {
  return `INPUT_ELEMENT:${String(row.ELEMENTID)}|${String(row.FROM_NODE)}->${String(row.TO_NODE)}`
    + `|${String(row.ELEMENT_NAME ?? '').trim()}`;
}

function sectionAndMaterial(row) {
  const outerDiameterM = Number(row.DIAMETER) * 1e-3;
  const wallThicknessM = Number(row.WALL_THICK) * 1e-3;
  const innerDiameterM = outerDiameterM - 2 * wallThicknessM;
  const areaM2 = Math.PI * (outerDiameterM ** 2 - innerDiameterM ** 2) / 4;
  const inertiaM4 = Math.PI * (outerDiameterM ** 4 - innerDiameterM ** 4) / 64;
  const elasticModulusPa = Number(row.MODULUS) * 1e3;
  const poissonRatio = Number(row.POISSONS);
  const shearModulusPa = elasticModulusPa / (2 * (1 + poissonRatio));
  return { outerDiameterM, wallThicknessM, innerDiameterM, areaM2, inertiaM4, elasticModulusPa, poissonRatio, shearModulusPa };
}

function elementLengthM(row) {
  return Math.hypot(Number(row.DELTA_X), Number(row.DELTA_Y), Number(row.DELTA_Z)) * 1e-3;
}

function timoshenkoBending(section, length, kappa) {
  const { elasticModulusPa: E, shearModulusPa: G, inertiaM4: I, areaM2: A } = section;
  const phi = 12 * E * I / (kappa * G * A * length ** 2);
  const EIbar = E * I / (1 + phi);
  const L = length;
  return {
    phi,
    matrix: [
      [12 * EIbar / L ** 3, 6 * EIbar / L ** 2, -12 * EIbar / L ** 3, 6 * EIbar / L ** 2],
      [6 * EIbar / L ** 2, (4 + phi) * EIbar / L, -6 * EIbar / L ** 2, (2 - phi) * EIbar / L],
      [-12 * EIbar / L ** 3, -6 * EIbar / L ** 2, 12 * EIbar / L ** 3, -6 * EIbar / L ** 2],
      [6 * EIbar / L ** 2, (2 - phi) * EIbar / L, -6 * EIbar / L ** 2, (4 + phi) * EIbar / L],
    ],
  };
}

function kinematics(rows) {
  const map = new Map();
  for (const row of rows) {
    if (row.entityKind !== 'NODE') continue;
    if (!['20350', '20390', '20440'].includes(String(row.entityId))) continue;
    if (row.quantity === 'DISPLACEMENT' && row.component === 'UZ') map.set(`${row.entityId}:UZ`, Number(row.value));
    if (row.quantity === 'ROTATION' && row.component === 'RY') map.set(`${row.entityId}:RY`, Number(row.value));
  }
  for (const id of ['20350', '20390', '20440']) {
    assert.ok(map.has(`${id}:UZ`), `missing ${id}:UZ`);
    assert.ok(map.has(`${id}:RY`), `missing ${id}:RY`);
  }
  return map;
}

function vectorFor(row, map) {
  const i = String(row.FROM_NODE);
  const j = String(row.TO_NODE);
  return [map.get(`${i}:UZ`), map.get(`${i}:RY`), map.get(`${j}:UZ`), map.get(`${j}:RY`)];
}

function reactionSensitivities(k22, k23) {
  return {
    '20350:UZ': k22[2][0],
    '20350:RY': k22[2][1],
    '20390:UZ': k22[2][2] + k23[0][0],
    '20390:RY': k22[2][3] + k23[0][1],
    '20440:UZ': k23[0][2],
    '20440:RY': k23[0][3],
  };
}

function actionWitness(rows, entityId, quantity, component, reconstructed, floor) {
  const reference = elementValue(rows, entityId, quantity, component);
  const error = reconstructed - reference;
  return { entityId, quantity, component, reference, reconstructed, error, normalizedError: Math.abs(error) / Math.max(Math.abs(reference), floor) };
}

function elementValue(rows, entityId, quantity, component) {
  const row = rows.find((entry) => entry.entityKind === 'ELEMENT'
    && entry.entityId === entityId && entry.quantity === quantity && entry.component === component);
  if (!row) throw new TypeError(`Missing ${entityId} ${quantity} ${component}`);
  return Number(row.value);
}

function nodeValue(rows, entityId, quantity, component) {
  const row = rows.find((entry) => entry.entityKind === 'NODE'
    && String(entry.entityId) === entityId && entry.quantity === quantity && entry.component === component);
  if (!row) throw new TypeError(`Missing node ${entityId} ${quantity} ${component}`);
  return Number(row.value);
}

function multiply(matrix, vector) {
  return matrix.map((row) => row.reduce((sum, value, index) => sum + value * vector[index], 0));
}

function relativeDifference(a, b) {
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1);
}

function parseArgs(tokens) {
  const result = {};
  for (let index = 0; index < tokens.length; index += 2) {
    const key = tokens[index];
    const value = tokens[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new TypeError(`Invalid arguments near ${String(key)}`);
    result[key.slice(2)] = value;
  }
  return result;
}

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}
