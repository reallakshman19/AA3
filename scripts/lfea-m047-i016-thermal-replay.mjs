import fs from 'node:fs';
import path from 'node:path';

const MM_TO_M = 1e-3;
const KPA_TO_PA = 1e3;
const KG_PER_CM3_TO_KG_PER_M3 = 1e6;
const CELSIUS_TO_KELVIN = 273.15;
const GRAVITY = 9.80665;
const PROFILE_ALPHA_TOLERANCE = 5e-11;
const STRAIN_SELF_CHECK_TOLERANCE = 5e-9;

const args = parseArgs(process.argv.slice(2));
const raw = readJson(requireArg(args, '--raw'));
const benchmark = readJson(requireArg(args, '--benchmark'));
const actual = readJson(requireArg(args, '--actual'));
const outPath = requireArg(args, '--out');

requireSchema(raw, 'caesar-accdb-raw-export/v1', 'raw ACCDB export');
requireSchema(actual, 'lfea-accdb-benchmark-actual/v1', 'candidate actual');
if (benchmark.schema !== 'lfea-caesar-accdb-benchmark-report/v1') {
  throw new TypeError(`Unsupported benchmark report schema ${String(benchmark.schema)}.`);
}

const sourceHash = String(raw.source?.sha256 ?? '').toLowerCase();
if (!sourceHash || String(benchmark.source?.sha256 ?? '').toLowerCase() !== sourceHash
  || String(actual.sourceAccdbSha256 ?? '').toLowerCase() !== sourceHash) {
  throw new TypeError('I016 source-hash custody mismatch between raw export, benchmark, and actual solve.');
}

const benchmarkCases = new Map(benchmark.cases.map((entry) => [entry.caseId, entry]));
const l19 = requireCase(benchmarkCases, 'L19', 'W+P1');
const l20 = requireCase(benchmarkCases, 'L20', 'W+T1+P1');
if (!actual.cases?.L19 || !actual.cases?.L20) throw new TypeError('I016 requires L19 and L20 actual cases.');

const sourceRows = requireTable(raw, 'INPUT_BASIC_ELEMENT_DATA').rows;
const coordinateRows = requireTable(raw, 'INPUT_NODAL_COORDINATES').rows;
const positions = buildPositions(coordinateRows);
const sourceById = new Map(sourceRows.map((row) => [String(row.ELEMENTID), row]));
const candidateLedger = actual.mechanics?.cases?.L20?.elementLedger ?? [];
const ledgerBySource = groupBy(candidateLedger, (entry) => String(entry.sourceElementId));
const ordinarySourceIds = [...ledgerBySource]
  .filter(([, entries]) => entries.length === 1 && entries[0].kind === 'FRAME' && entries[0].teeJunctionNodeId === null)
  .map(([sourceElementId]) => sourceElementId)
  .sort(numericTextCompare);

const referenceIndex = {
  L19: indexRows(l19.referenceRows),
  L20: indexRows(l20.referenceRows),
};
const actualIndex = {
  L19: indexRows(actual.cases.L19.rows),
  L20: indexRows(actual.cases.L20.rows),
};
const profileAlpha = Number(actual.mechanics?.profile?.thermalExpansionCoefficientPerKelvin);
if (!Number.isFinite(profileAlpha)) throw new TypeError('Candidate mechanics profile lacks thermal expansion coefficient.');
const installationTemperatureK = Number(benchmark.model?.installationTemperatureK);
if (!Number.isFinite(installationTemperatureK)) throw new TypeError('Benchmark lacks installation temperature.');

const records = [];
for (const sourceElementId of ordinarySourceIds) {
  const row = sourceById.get(sourceElementId);
  if (!row) throw new TypeError(`I016 ledger source ${sourceElementId} is absent from INPUT_BASIC_ELEMENT_DATA.`);
  const nodeI = String(row.FROM_NODE);
  const nodeJ = String(row.TO_NODE);
  const pointI = requirePosition(positions, nodeI);
  const pointJ = requirePosition(positions, nodeJ);
  const delta = subtract(pointJ, pointI);
  const length = Math.hypot(...delta);
  if (!(length > 0)) throw new TypeError(`Source ${sourceElementId} has zero length.`);
  const axis = delta.map((value) => value / length);
  const section = pipeSection(row);
  const eCold = Number(row.MODULUS) * KPA_TO_PA;
  const eHot = Number(row.HOT_MOD1) * KPA_TO_PA;
  if (!(eCold > 0) || !(eHot > 0)) throw new TypeError(`Source ${sourceElementId} lacks positive MODULUS/HOT_MOD1.`);
  const temperatureK = Number(row.TEMP_EXP_C1) + CELSIUS_TO_KELVIN;
  const deltaT = temperatureK - installationTemperatureK;
  if (!(deltaT > 0)) throw new TypeError(`Source ${sourceElementId} has non-positive L20 deltaT.`);
  const gravityEqI = axialGravityEquivalentAtI(row, section, axis, length);
  const pressureCold = closedEndPressureAxialStrain(row, eCold, section);
  const pressureHot = closedEndPressureAxialStrain(row, eHot, section);
  const entityId = sourceResultElementId(row);

  const caesar19 = inferTotalStrain({
    index: referenceIndex.L19, nodeI, nodeJ, entityId, axis, length,
    elasticModulus: eCold, area: section.area, gravityEqI,
  });
  const caesar20Hot = inferTotalStrain({
    index: referenceIndex.L20, nodeI, nodeJ, entityId, axis, length,
    elasticModulus: eHot, area: section.area, gravityEqI,
  });
  const caesar20Cold = inferTotalStrain({
    index: referenceIndex.L20, nodeI, nodeJ, entityId, axis, length,
    elasticModulus: eCold, area: section.area, gravityEqI,
  });
  const lfea19 = inferTotalStrain({
    index: actualIndex.L19, nodeI, nodeJ, entityId, axis, length,
    elasticModulus: eCold, area: section.area, gravityEqI,
  });
  const lfea20 = inferTotalStrain({
    index: actualIndex.L20, nodeI, nodeJ, entityId, axis, length,
    elasticModulus: eHot, area: section.area, gravityEqI,
  });

  const caesarAlphaHot = (caesar20Hot.totalStrain - pressureHot) / deltaT;
  const caesarAlphaCold = (caesar20Cold.totalStrain - pressureCold) / deltaT;
  const lfeaAlpha = (lfea20.totalStrain - pressureHot) / deltaT;
  records.push({
    sourceElementId,
    entityId,
    nodeI,
    nodeJ,
    lengthM: length,
    axis,
    deltaT,
    section: {
      outerDiameterM: section.outerDiameter,
      wallThicknessM: section.wallThickness,
      innerDiameterM: section.innerDiameter,
      areaM2: section.area,
    },
    material: {
      modulusColdPa: eCold,
      modulusHot1Pa: eHot,
      poissonRatio: Number(row.POISSONS),
    },
    pressure: {
      pressurePa: Number(row.PRESSURE1) * KPA_TO_PA,
      predictedStrainCold: pressureCold,
      predictedStrainHot: pressureHot,
      caesarL19ResidualStrain: caesar19.totalStrain - pressureCold,
      lfeaL19ResidualStrain: lfea19.totalStrain - pressureCold,
    },
    caesar: {
      l19: caesar19,
      l20HotModulusHypothesis: caesar20Hot,
      l20ColdModulusHypothesis: caesar20Cold,
      impliedThermalAlphaHotModulus: caesarAlphaHot,
      impliedThermalAlphaColdModulus: caesarAlphaCold,
      incrementalAxialExtensionM: caesar20Hot.axialExtensionM - caesar19.axialExtensionM,
      incrementalFromEndAxialForceN: caesar20Hot.axialForceFromN - caesar19.axialForceFromN,
    },
    lfea: {
      l19: lfea19,
      l20: lfea20,
      impliedThermalAlphaHotModulus: lfeaAlpha,
      alphaErrorFromProfile: lfeaAlpha - profileAlpha,
      incrementalAxialExtensionM: lfea20.axialExtensionM - lfea19.axialExtensionM,
      incrementalFromEndAxialForceN: lfea20.axialForceFromN - lfea19.axialForceFromN,
    },
  });
}

if (records.length === 0) throw new TypeError('I016 selected no ordinary plain-FRAME sources.');
const lfeaPressureMax = maxAbs(records.map((entry) => entry.pressure.lfeaL19ResidualStrain));
const lfeaAlphaMax = maxAbs(records.map((entry) => entry.lfea.alphaErrorFromProfile));
const endpointClosureMax = maxAbs(records.flatMap((entry) => [
  entry.caesar.l19.endpointClosureStrain,
  entry.caesar.l20HotModulusHypothesis.endpointClosureStrain,
  entry.lfea.l19.endpointClosureStrain,
  entry.lfea.l20.endpointClosureStrain,
]));
if (lfeaPressureMax > STRAIN_SELF_CHECK_TOLERANCE || lfeaAlphaMax > PROFILE_ALPHA_TOLERANCE) {
  throw new Error(
    `I016 algebra self-check failed: LFEA pressure residual max=${lfeaPressureMax}, alpha error max=${lfeaAlphaMax}.`,
  );
}

const caesarHot = stats(records.map((entry) => entry.caesar.impliedThermalAlphaHotModulus), profileAlpha);
const caesarCold = stats(records.map((entry) => entry.caesar.impliedThermalAlphaColdModulus), profileAlpha);
const pressureResidual = stats(records.map((entry) => entry.pressure.caesarL19ResidualStrain), 0);
const preferredModulusHypothesis = chooseHypothesis(caesarHot, caesarCold);

const output = {
  schema: 'lfea-m047-i016-thermal-replay/v1',
  issueId: 'M047',
  sourceAccdbSha256: sourceHash,
  benchmarkId: benchmark.benchmarkId,
  profileId: benchmark.profileId,
  candidateExecutionEvidenceHash: actual.cases.L20.executionEvidenceHash,
  selection: {
    rule: 'ONE_ANALYSIS_CARRIER_KIND_FRAME_NO_TEE_V1',
    ordinaryPlainFrameSourceCount: records.length,
    sourceElementIds: records.map((entry) => entry.sourceElementId),
  },
  authorities: {
    installationTemperatureK,
    currentProfileThermalExpansionCoefficientPerKelvin: profileAlpha,
    gravityAcceleration: GRAVITY,
    pressureStrainRule: 'CLOSED_END_POISSON_CORRECTED_AXIAL_STRAIN_V1',
    recoveryRule: 'q=Kd-equivalentLoad-initialStrainLoad',
  },
  selfCheck: {
    status: 'PASS',
    lfeaL19PressureResidualStrainAbsMax: lfeaPressureMax,
    lfeaThermalAlphaErrorFromProfileAbsMax: lfeaAlphaMax,
    endpointInferredStrainClosureAbsMax: endpointClosureMax,
    strainTolerance: STRAIN_SELF_CHECK_TOLERANCE,
    alphaTolerance: PROFILE_ALPHA_TOLERANCE,
  },
  caesar: {
    l19PressureResidualStrain: pressureResidual,
    impliedThermalAlpha: {
      hotMod1Hypothesis: caesarHot,
      coldModulusHypothesis: caesarCold,
      preferredByRmsErrorToCurrentProfile: preferredModulusHypothesis,
    },
  },
  records,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({
  sourceCount: records.length,
  profileAlpha,
  hotMedian: caesarHot.median,
  hotRmsErrorToProfile: caesarHot.rmsErrorToTarget,
  coldMedian: caesarCold.median,
  coldRmsErrorToProfile: caesarCold.rmsErrorToTarget,
  preferredModulusHypothesis,
  caesarL19PressureResidualRms: pressureResidual.rmsErrorToTarget,
  selfCheck: output.selfCheck,
}, null, 2));

function inferTotalStrain({ index, nodeI, nodeJ, entityId, axis, length, elasticModulus, area, gravityEqI }) {
  const uI = displacementVector(index, nodeI);
  const uJ = displacementVector(index, nodeJ);
  const axialExtensionM = dot(subtract(uJ, uI), axis);
  const forceFrom = endForceVector(index, entityId, 'FROM');
  const forceTo = endForceVector(index, entityId, 'TO');
  const axialForceFromN = dot(forceFrom, axis);
  const axialForceToN = dot(forceTo, axis);
  const ea = elasticModulus * area;
  const fromInferred = (axialForceFromN + gravityEqI) / ea + axialExtensionM / length;
  const toInferred = axialExtensionM / length - (axialForceToN + gravityEqI) / ea;
  return {
    totalStrain: 0.5 * (fromInferred + toInferred),
    fromInferredStrain: fromInferred,
    toInferredStrain: toInferred,
    endpointClosureStrain: fromInferred - toInferred,
    axialExtensionM,
    axialForceFromN,
    axialForceToN,
    gravityEquivalentAxialForceAtEachEndN: gravityEqI,
  };
}

function displacementVector(index, nodeId) {
  return ['UX', 'UY', 'UZ'].map((component) => requireResult(index, 'NODE', nodeId, 'DISPLACEMENT', component));
}

function endForceVector(index, entityId, end) {
  return ['FX', 'FY', 'FZ'].map((component) =>
    requireResult(index, 'ELEMENT', entityId, `GLOBAL_END_FORCE_${end}`, component));
}

function axialGravityEquivalentAtI(row, section, axis, length) {
  const lineWeight = physicalLineWeight(row, section);
  const localAxialIntensity = -lineWeight * axis[1];
  return localAxialIntensity * length / 2;
}

function physicalLineWeight(row, section) {
  const pipe = density(row.PIPE_DENSITY) * section.area * GRAVITY;
  const fluidArea = Math.PI * section.innerDiameter ** 2 / 4;
  const contents = density(row.FLUID_DENSITY) * fluidArea * GRAVITY;
  const insulationThickness = Number(row.INSUL_THICK) * MM_TO_M;
  const insulatedOd = section.outerDiameter + 2 * insulationThickness;
  const insulationArea = Math.PI * (insulatedOd ** 2 - section.outerDiameter ** 2) / 4;
  const insulation = density(row.INSUL_DENSITY) * insulationArea * GRAVITY;
  return pipe + contents + insulation;
}

function pipeSection(row) {
  const outerDiameter = Number(row.DIAMETER) * MM_TO_M;
  const wallThickness = Number(row.WALL_THICK) * MM_TO_M;
  const innerDiameter = outerDiameter - 2 * wallThickness;
  if (!(innerDiameter > 0)) throw new TypeError(`Invalid pipe section on source ${row.ELEMENTID}.`);
  return {
    outerDiameter,
    wallThickness,
    innerDiameter,
    area: Math.PI * (outerDiameter ** 2 - innerDiameter ** 2) / 4,
  };
}

function closedEndPressureAxialStrain(row, elasticModulus, section) {
  const pressure = Number(row.PRESSURE1) * KPA_TO_PA;
  const poissonRatio = Number(row.POISSONS);
  return (1 - 2 * poissonRatio) * pressure * section.innerDiameter ** 2
    / (elasticModulus * (section.outerDiameter ** 2 - section.innerDiameter ** 2));
}

function buildPositions(rows) {
  const positions = new Map();
  for (const row of rows) {
    setPosition(positions, row.FROM_NODE, [row.FROM_NODE_X, row.FROM_NODE_Y, row.FROM_NODE_Z]);
    setPosition(positions, row.TO_NODE, [row.TO_NODE_X, row.TO_NODE_Y, row.TO_NODE_Z]);
  }
  return positions;
}

function setPosition(positions, nodeId, millimetres) {
  const id = String(nodeId);
  const point = millimetres.map((value) => Number(value) * MM_TO_M);
  const prior = positions.get(id);
  if (prior && Math.hypot(...subtract(prior, point)) > 1e-7) {
    throw new TypeError(`Node ${id} has inconsistent coordinates in I016 raw export.`);
  }
  positions.set(id, point);
}

function requirePosition(positions, nodeId) {
  const value = positions.get(String(nodeId));
  if (!value) throw new TypeError(`Missing coordinate for node ${nodeId}.`);
  return value;
}

function sourceResultElementId(row) {
  return `INPUT_ELEMENT:${String(row.ELEMENTID)}|${String(row.FROM_NODE)}->${String(row.TO_NODE)}`
    + `|${String(row.ELEMENT_NAME ?? '').trim()}`;
}

function indexRows(rows) {
  const index = new Map();
  for (const row of rows) {
    const key = resultKey(row.entityKind, row.entityId, row.quantity, row.component);
    if (index.has(key)) throw new TypeError(`Duplicate benchmark result row ${key}.`);
    index.set(key, Number(row.value));
  }
  return index;
}

function requireResult(index, entityKind, entityId, quantity, component) {
  const key = resultKey(entityKind, entityId, quantity, component);
  const value = index.get(key);
  if (!Number.isFinite(value)) throw new TypeError(`Missing finite result ${key}.`);
  return value;
}

function resultKey(entityKind, entityId, quantity, component) {
  return `${entityKind}|${entityId}|${quantity}|${component}`;
}

function stats(values, target) {
  const finite = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (finite.length === 0) throw new TypeError('Cannot summarize an empty finite population.');
  const med = median(finite);
  const deviations = finite.map((value) => Math.abs(value - med)).sort((a, b) => a - b);
  return {
    count: finite.length,
    min: finite[0],
    max: finite.at(-1),
    median: med,
    mad: median(deviations),
    mean: finite.reduce((sum, value) => sum + value, 0) / finite.length,
    rmsDeviationFromMedian: Math.sqrt(finite.reduce((sum, value) => sum + (value - med) ** 2, 0) / finite.length),
    target,
    medianErrorToTarget: med - target,
    rmsErrorToTarget: Math.sqrt(finite.reduce((sum, value) => sum + (value - target) ** 2, 0) / finite.length),
  };
}

function chooseHypothesis(hot, cold) {
  if (hot.rmsErrorToTarget < cold.rmsErrorToTarget) return 'HOT_MOD1';
  if (cold.rmsErrorToTarget < hot.rmsErrorToTarget) return 'MODULUS';
  return 'TIE';
}

function median(values) {
  const middle = Math.floor(values.length / 2);
  return values.length % 2 ? values[middle] : 0.5 * (values[middle - 1] + values[middle]);
}

function maxAbs(values) { return Math.max(...values.map((value) => Math.abs(value))); }
function density(value) { return Number(value) * KG_PER_CM3_TO_KG_PER_M3; }
function dot(left, right) { return left.reduce((sum, value, index) => sum + value * right[index], 0); }
function subtract(left, right) { return left.map((value, index) => value - right[index]); }
function numericTextCompare(left, right) { return Number(left) - Number(right); }
function groupBy(values, keyOf) {
  const result = new Map();
  for (const value of values) {
    const key = keyOf(value);
    if (!result.has(key)) result.set(key, []);
    result.get(key).push(value);
  }
  return result;
}
function requireTable(rawExport, tableName) {
  const table = rawExport.tables?.[tableName];
  if (!table || !Array.isArray(table.rows)) throw new TypeError(`I016 raw export lacks ${tableName}.`);
  return table;
}
function requireCase(cases, caseId, formula) {
  const value = cases.get(caseId);
  if (!value || value.formula !== formula) throw new TypeError(`I016 requires ${caseId} formula ${formula}.`);
  return value;
}
function requireSchema(value, schema, label) {
  if (!value || value.schema !== schema) throw new TypeError(`${label} must use schema ${schema}.`);
}
function readJson(path) { return JSON.parse(fs.readFileSync(path, 'utf8')); }
function requireArg(values, name) {
  const value = values[name];
  if (!value) throw new TypeError(`Missing required argument ${name}.`);
  return value;
}
function parseArgs(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index];
    const value = values[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new TypeError(`Invalid CLI arguments near ${String(key)}.`);
    result[key] = value;
  }
  return result;
}
