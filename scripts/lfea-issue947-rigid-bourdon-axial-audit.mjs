#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

const EXPECTED_SOURCE_SHA256 = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const RIGID_WALL_MULTIPLIER = 10;
const EXPECTED_RIGID_ELEMENT_COUNT = 20;
const EXISTING_SMALL_FORCE_GATE_N = 5; // Existing 10% benchmark gate on the existing 50 N force floor.
const FORCE_COMPONENTS = Object.freeze(['FX', 'FY', 'FZ']);
const DISPLACEMENT_COMPONENTS = Object.freeze(['UX', 'UY', 'UZ']);

const args = parseArgs(process.argv.slice(2));
if (!args.package) {
  throw new TypeError('Usage: node scripts/lfea-issue947-rigid-bourdon-axial-audit.mjs --package <canonical-package.json> [--out <json>]');
}

const pkg = JSON.parse(readFileSync(args.package, 'utf8'));
requirePinnedPackage(pkg);
const sourceRows = pkg.model.tables.INPUT_BASIC_ELEMENT_DATA.rows;
const referenceRows = pkg.references.L19.rows;
const rigidRows = sourceRows
  .filter((row) => Number(row.RIGID_PTR) > 0)
  .sort((left, right) => Number(left.ELEMENTID) - Number(right.ELEMENTID));
assert.equal(rigidRows.length, EXPECTED_RIGID_ELEMENT_COUNT, 'BM4_NL rigid-element population drift.');

const records = rigidRows.map((row) => auditRigid(row, referenceRows));
const summaries = {
  pressureOmitted: summarize(records.map((record) => record.candidates.pressureOmitted.errorN)),
  physicalPipePressureStrainOnRigidEA: summarize(records.map((record) => record.candidates.physicalPipePressureStrainOnRigidEA.errorN)),
  rigidStiffnessSectionBourdon: summarize(records.map((record) => record.candidates.rigidStiffnessSectionBourdon.errorN)),
  displacementClosure: summarize(records.map((record) => record.rigidStiffnessSectionBourdon.displacementClosureResidualM)),
};
const rigidCandidateImprovesEveryElement = records.every((record) =>
  Math.abs(record.candidates.rigidStiffnessSectionBourdon.errorN) < Math.abs(record.candidates.pressureOmitted.errorN)
  && Math.abs(record.candidates.rigidStiffnessSectionBourdon.errorN)
    < Math.abs(record.candidates.physicalPipePressureStrainOnRigidEA.errorN));
const existingForceGatePassesEveryRigid = records.every((record) =>
  Math.abs(record.candidates.rigidStiffnessSectionBourdon.errorN) <= EXISTING_SMALL_FORCE_GATE_N);

const e79 = records.find((record) => record.sourceElementId === '79');
if (!e79) throw new TypeError('E79 rigid witness is missing.');

const output = {
  schema: 'lfea-issue947-rigid-bourdon-axial-audit/v1',
  issue: 947,
  caseId: 'L19',
  sourceAccdbSha256: pkg.source.sha256,
  purpose: 'INDEPENDENT_RIGID_AXIAL_PRESSURE_MECHANICS_AUDIT_NO_PRODUCTION_UPDATE',
  governingEquations: {
    rigidStiffness: 't_rigid = 10 t_entered; D_o,rigid = D_i + 2 t_rigid; EA_rigid = E A_rigid',
    bourdonAxialForce: 'F_B = (1 - 2 nu) P A_i, where A_i = pi D_i^2 / 4',
    equivalentRigidPressureStrain: 'epsilon_p,rigid = F_B / EA_rigid',
    recoveredFromEndAxialAction: 'N_I = F_B - (EA_rigid/L) Delta_u_x',
  },
  authorityIntent: {
    rigidStiffness: 'HEXAGON_CAESAR_II_RIGID_10X_ENTERED_WALL',
    pressureEffect: 'CAESAR_BOURDON_STRAIGHT_PIPE_AXIAL_ELONGATION_AND_BOURDON_FORCE_RELATION',
  },
  existingBenchmarkForceGateN: EXISTING_SMALL_FORCE_GATE_N,
  population: {
    rigidElementCount: records.length,
    expectedRigidElementCount: EXPECTED_RIGID_ELEMENT_COUNT,
  },
  summaries,
  e79Witness: {
    sourceElementId: e79.sourceElementId,
    fromNode: e79.fromNode,
    toNode: e79.toNode,
    exportedAxialRelativeDisplacementM: e79.kinematics.exportedAxialRelativeDisplacementM,
    rigidPressureFreeGrowthM: e79.rigidStiffnessSectionBourdon.freeGrowthM,
    freeGrowthRelativeDifference: Math.abs(
      e79.kinematics.exportedAxialRelativeDisplacementM - e79.rigidStiffnessSectionBourdon.freeGrowthM
    ) / Math.abs(e79.rigidStiffnessSectionBourdon.freeGrowthM),
    caesarLocalAxialForceFromN: e79.reference.localAxialForceFromN,
    predictedLocalAxialForceFromN: e79.candidates.rigidStiffnessSectionBourdon.predictedN,
    errorN: e79.candidates.rigidStiffnessSectionBourdon.errorN,
  },
  records,
  gates: {
    rigidPopulation: {
      status: records.length === EXPECTED_RIGID_ELEMENT_COUNT ? 'PASS' : 'FAIL',
      rule: `Exact BM4_NL L19 audit shall cover all ${EXPECTED_RIGID_ELEMENT_COUNT} source elements with RIGID_PTR > 0.`,
    },
    rigidBourdonImprovesEveryElement: {
      status: rigidCandidateImprovesEveryElement ? 'PASS' : 'FAIL',
      rule: 'The 10x-wall rigid-stiffness Bourdon candidate shall reduce absolute local axial-force error for every rigid versus both pressure omission and applying physical-pipe pressure strain to rigid EA.',
    },
    rigidBourdonPassesExistingForceGateEveryElement: {
      status: existingForceGatePassesEveryRigid ? 'PASS' : 'FAIL',
      rule: `Every rigid local axial-force error shall be <= ${EXISTING_SMALL_FORCE_GATE_N} N, equal to the existing 10% comparison gate on the existing 50 N small-force floor.`,
    },
  },
  classification: rigidCandidateImprovesEveryElement && existingForceGatePassesEveryRigid
    ? 'RIGID_BOURDON_FORCE_ON_10X_WALL_STIFFNESS_SUPPORTED'
    : 'RIGID_PRESSURE_MECHANIC_NOT_QUALIFIED',
  falsificationRule: 'Reject the candidate if any BM4_NL rigid is worsened versus pressure omission/physical-pipe-strain alternatives, or if any rigid exceeds the unchanged existing small-force comparison gate.',
  nextGate: 'IMPLEMENT_RIGID_PRESSURE_INITIAL_FORCE_IN_PRODUCTION_WITH_CANONICAL_RIGID_REGRESSION_THEN_RUN_FULL_L19_REPLAY',
};

if (args.out) writeFileSync(args.out, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
console.log(`Issue 947 rigid Bourdon axial audit: ${output.classification}`);

function auditRigid(row, refs) {
  const sourceElementId = String(row.ELEMENTID);
  const fromNode = String(row.FROM_NODE);
  const toNode = String(row.TO_NODE);
  const directionVector = [Number(row.DELTA_X), Number(row.DELTA_Y), Number(row.DELTA_Z)].map((value) => value * 1e-3);
  const length = Math.hypot(...directionVector);
  if (!(length > 0)) throw new TypeError(`Rigid E${sourceElementId} has zero length.`);
  const xAxis = directionVector.map((value) => value / length);
  const fromDisplacement = nodeVector(refs, fromNode, 'DISPLACEMENT', DISPLACEMENT_COMPONENTS);
  const toDisplacement = nodeVector(refs, toNode, 'DISPLACEMENT', DISPLACEMENT_COMPONENTS);
  const exportedAxialRelativeDisplacementM = dot(subtract(toDisplacement, fromDisplacement), xAxis);
  const sourceEntityId = resultElementId(row);
  const globalForceFrom = elementVector(refs, sourceEntityId, 'GLOBAL_END_FORCE_FROM', FORCE_COMPONENTS);
  const localAxialForceFromN = dot(globalForceFrom, xAxis);

  const elasticModulus = Number(row.MODULUS) * 1e3;
  const poissonRatio = Number(row.POISSONS);
  const pressure = Number(row.PRESSURE1) * 1e3;
  const enteredOutsideDiameter = Number(row.DIAMETER) * 1e-3;
  const enteredWallThickness = Number(row.WALL_THICK) * 1e-3;
  const insideDiameter = enteredOutsideDiameter - 2 * enteredWallThickness;
  if (!(insideDiameter > 0)) throw new TypeError(`Rigid E${sourceElementId} has invalid entered pipe geometry.`);
  const rigidWallThickness = RIGID_WALL_MULTIPLIER * enteredWallThickness;
  const rigidOutsideDiameter = insideDiameter + 2 * rigidWallThickness;
  const physicalArea = annulusArea(enteredOutsideDiameter, insideDiameter);
  const rigidArea = annulusArea(rigidOutsideDiameter, insideDiameter);
  const rigidEA = elasticModulus * rigidArea;
  const insideArea = Math.PI * insideDiameter ** 2 / 4;
  const bourdonAxialForceN = (1 - 2 * poissonRatio) * pressure * insideArea;
  const physicalPressureStrain = bourdonAxialForceN / (elasticModulus * physicalArea);
  const rigidPressureStrain = bourdonAxialForceN / rigidEA;
  const axialStrainFromExport = exportedAxialRelativeDisplacementM / length;

  const pressureOmitted = -rigidEA * axialStrainFromExport;
  const physicalPipePressureStrainOnRigidEA = rigidEA * (physicalPressureStrain - axialStrainFromExport);
  const rigidStiffnessSectionBourdon = bourdonAxialForceN - rigidEA * axialStrainFromExport;
  const expectedDisplacementFromReference = length * (rigidPressureStrain - localAxialForceFromN / rigidEA);

  return {
    sourceElementId,
    fromNode,
    toNode,
    rigidPtr: Number(row.RIGID_PTR),
    geometry: {
      lengthM: length,
      xAxis,
      enteredOutsideDiameterM: enteredOutsideDiameter,
      enteredWallThicknessM: enteredWallThickness,
      insideDiameterM: insideDiameter,
      rigidWallThicknessM: rigidWallThickness,
      rigidOutsideDiameterM: rigidOutsideDiameter,
      physicalAreaM2: physicalArea,
      rigidAreaM2: rigidArea,
    },
    materialPressure: {
      elasticModulusPa: elasticModulus,
      poissonRatio,
      pressurePa: pressure,
      insideAreaM2: insideArea,
      bourdonAxialForceN,
    },
    kinematics: {
      fromDisplacementM: fromDisplacement,
      toDisplacementM: toDisplacement,
      exportedAxialRelativeDisplacementM,
      axialStrainFromExport,
    },
    reference: {
      globalForceFromN: globalForceFrom,
      localAxialForceFromN,
    },
    rigidStiffnessSectionBourdon: {
      rigidEA,
      equivalentPressureStrain: rigidPressureStrain,
      freeGrowthM: rigidPressureStrain * length,
      expectedDisplacementFromReferenceM: expectedDisplacementFromReference,
      displacementClosureResidualM: exportedAxialRelativeDisplacementM - expectedDisplacementFromReference,
    },
    candidates: {
      pressureOmitted: candidate(pressureOmitted, localAxialForceFromN),
      physicalPipePressureStrainOnRigidEA: candidate(physicalPipePressureStrainOnRigidEA, localAxialForceFromN),
      rigidStiffnessSectionBourdon: candidate(rigidStiffnessSectionBourdon, localAxialForceFromN),
    },
  };
}

function candidate(predictedN, referenceN) {
  return { predictedN, referenceN, errorN: predictedN - referenceN };
}

function nodeVector(rows, nodeId, quantity, components) {
  return components.map((component) => requireResult(rows, 'NODE', nodeId, quantity, component).value);
}

function elementVector(rows, entityId, quantity, components) {
  return components.map((component) => requireResult(rows, 'ELEMENT', entityId, quantity, component).value);
}

function requireResult(rows, entityKind, entityId, quantity, component) {
  const matches = rows.filter((row) => row.entityKind === entityKind
    && String(row.entityId) === String(entityId)
    && row.quantity === quantity
    && row.component === component);
  if (matches.length !== 1) {
    throw new TypeError(`Expected one ${entityKind} ${entityId} ${quantity}:${component} row; found ${matches.length}.`);
  }
  const row = matches[0];
  if (typeof row.value !== 'number' || !Number.isFinite(row.value)) throw new TypeError('Reference result must be finite.');
  return row;
}

function resultElementId(row) {
  return `INPUT_ELEMENT:${String(row.ELEMENTID)}|${String(row.FROM_NODE)}->${String(row.TO_NODE)}`
    + `|${String(row.ELEMENT_NAME ?? '').trim()}`;
}

function annulusArea(outerDiameter, innerDiameter) {
  return Math.PI * (outerDiameter ** 2 - innerDiameter ** 2) / 4;
}

function summarize(values) {
  if (!Array.isArray(values) || values.length === 0) throw new TypeError('Cannot summarize empty values.');
  const abs = values.map(Math.abs);
  return {
    count: values.length,
    rms: Math.sqrt(values.reduce((sum, value) => sum + value ** 2, 0) / values.length),
    meanAbs: abs.reduce((sum, value) => sum + value, 0) / values.length,
    maxAbs: Math.max(...abs),
  };
}

function dot(left, right) {
  return left.reduce((sum, value, index) => sum + value * right[index], 0);
}

function subtract(left, right) {
  return left.map((value, index) => value - right[index]);
}

function requirePinnedPackage(value) {
  if (!value || value.schema !== 'caesar-accdb-benchmark-package/v1') throw new TypeError('Canonical CAESAR ACCDB package is required.');
  assert.equal(value.source?.sha256, EXPECTED_SOURCE_SHA256, 'ACCDB SHA-256 drift.');
  if (!Array.isArray(value.model?.tables?.INPUT_BASIC_ELEMENT_DATA?.rows)) throw new TypeError('INPUT_BASIC_ELEMENT_DATA rows missing.');
  if (!Array.isArray(value.references?.L19?.rows)) throw new TypeError('L19 reference rows missing.');
  assert.equal(value.profile?.linearSolve?.bourdonPressureEffects?.mode, 'TRANSLATION_AND_ROTATION', 'BM4_NL Bourdon mode drift.');
}

function parseArgs(argv) {
  const result = { package: null, out: null };
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new TypeError(`Invalid argument near ${String(key)}.`);
    if (key === '--package') result.package = value;
    else if (key === '--out') result.out = value;
    else throw new TypeError(`Unknown argument ${key}.`);
  }
  return result;
}
