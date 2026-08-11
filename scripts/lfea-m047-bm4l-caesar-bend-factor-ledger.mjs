#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import {
  COMPONENT_GEOMETRY_SCHEMA,
  FACTOR_CALCULATION_REQUEST_SCHEMA,
  calculateB31Factors,
} from '../src/core/linear-fea-b31-factor-calculator/index.js';

const args = parseArgs(process.argv.slice(2));
const raw = JSON.parse(readFileSync(required(args, 'raw'), 'utf8'));
const misc = readFileSync(required(args, 'misc'), 'utf8');
const out = required(args, 'out');
const mdOut = required(args, 'md');

if (raw.schema !== 'caesar-accdb-raw-export/v1') throw new Error('Unexpected raw export schema.');
const sourceRows = raw.tables.INPUT_BASIC_ELEMENT_DATA?.rows ?? [];
const bendRows = raw.tables.INPUT_BENDS?.rows ?? [];
const bendByPointer = new Map(bendRows.map((row) => [Number(row.BEND_PTR), row]));
const caesarByNode = parseCaesarBends(misc);

const bendSources = sourceRows
  .filter((row) => Number(row.BEND_PTR) > 0)
  .sort((a, b) => Number(a.TO_NODE) - Number(b.TO_NODE));
if (bendSources.length !== 12) throw new Error(`Expected 12 source bends, got ${bendSources.length}.`);
if (caesarByNode.size !== 12) throw new Error(`Expected 12 CAESAR bend report rows, got ${caesarByNode.size}.`);

const rows = bendSources.map((source) => {
  const pointer = Number(source.BEND_PTR);
  const declaration = bendByPointer.get(pointer);
  if (!declaration) throw new Error(`Missing INPUT_BENDS row for pointer ${pointer}.`);
  const bendNode = String(Math.trunc(Number(source.TO_NODE)));
  const caesar = caesarByNode.get(bendNode);
  if (!caesar) throw new Error(`No CAESAR bend report row for source TO node ${bendNode}.`);

  const pressuresKpa = Array.from({ length: 9 }, (_, i) => Number(source[`PRESSURE${i + 1}`]))
    .filter((value) => Number.isFinite(value) && value >= 0);
  const hydroKpa = Number(source.HYDRO_PRESSURE);
  const p1Kpa = Number(source.PRESSURE1);
  const p1p9MaxKpa = Math.max(...pressuresKpa);
  const maxDefinedKpa = Math.max(...pressuresKpa, Number.isFinite(hydroKpa) ? hydroKpa : -Infinity);

  const common = {
    outerDiameter: Number(source.DIAMETER) * 0.001,
    wallThickness: Number(source.WALL_THICK) * 0.001,
    bendRadius: Number(declaration.RADIUS) * 0.001,
    elasticModulus: Number(source.MODULUS) * 1000,
    bendAngleDegrees: 90,
    smooth90FlexibilityCorrection: true,
  };
  const zero = calculate(common, 0, `BEND-${bendNode}-P0`);
  const p1 = calculate(common, p1Kpa * 1000, `BEND-${bendNode}-P1`);
  const p1p9 = calculate(common, p1p9MaxKpa * 1000, `BEND-${bendNode}-P1P9MAX`);
  const hydro = calculate(common, hydroKpa * 1000, `BEND-${bendNode}-HYDRO`);
  const current = calculate(common, maxDefinedKpa * 1000, `BEND-${bendNode}-MAXDEFINED`);

  const hDelta = relativeDelta(current.factors.flexibilityCharacteristic, caesar.h);
  const zeroFlexDelta = relativeDelta(zero.factors.flexibility.inPlane, caesar.flexHigh);
  const currentFlexDelta = relativeDelta(current.factors.flexibility.inPlane, caesar.flexLow);
  const zeroSifIDelta = relativeDelta(zero.factors.displacementSifs.inPlaneBending, caesar.sifIHigh);
  const currentSifIDelta = relativeDelta(current.factors.displacementSifs.inPlaneBending, caesar.sifILow);
  const zeroSifODelta = relativeDelta(zero.factors.displacementSifs.outOfPlaneBending, caesar.sifOHigh);
  const currentSifODelta = relativeDelta(current.factors.displacementSifs.outOfPlaneBending, caesar.sifOLow);

  return {
    bendNode,
    sourceElementId: String(source.ELEMENTID),
    bendPointer: pointer,
    geometry: {
      outerDiameterMm: Number(source.DIAMETER),
      wallThicknessMm: Number(source.WALL_THICK),
      bendRadiusMm: Number(declaration.RADIUS),
      elasticModulusKpa: Number(source.MODULUS),
    },
    pressureKpa: { p1: p1Kpa, p1p9Max: p1p9MaxKpa, hydro: hydroKpa, currentMaxDefined: maxDefinedKpa },
    caesar,
    lfea: {
      h: current.factors.flexibilityCharacteristic,
      zero: factorSummary(zero),
      p1: factorSummary(p1),
      p1p9Max: factorSummary(p1p9),
      hydro: factorSummary(hydro),
      currentMaxDefined: factorSummary(current),
    },
    comparison: {
      hRelativeDelta: hDelta,
      zeroToCaesarMaxFlexRelativeDelta: zeroFlexDelta,
      currentToCaesarMinFlexRelativeDelta: currentFlexDelta,
      zeroToCaesarMaxSifIRelativeDelta: zeroSifIDelta,
      currentToCaesarMinSifIRelativeDelta: currentSifIDelta,
      zeroToCaesarMaxSifORelativeDelta: zeroSifODelta,
      currentToCaesarMinSifORelativeDelta: currentSifODelta,
      bestPressureCandidateByFlex: bestCandidate(caesar.flexLow, { p1, p1p9Max: p1p9, hydro, currentMaxDefined: current }),
    },
  };
});

const maximum = (key) => Math.max(...rows.map((row) => Math.abs(row.comparison[key])));
const result = {
  schema: 'lfea-m047-bm4l-caesar-bend-factor-ledger/v1',
  sourceSha256: raw.source.sha256,
  bendCount: rows.length,
  interpretation: {
    caesarRange: 'Report arrows are treated as pressure-stiffened minimum -> unpressurized maximum; this is verified by direct zero-pressure and governed-pressure comparisons rather than assumed for acceptance.',
    currentProductionPressureRule: 'MAX_DEFINED includes P1-P9 and HYDRO_PRESSURE in caesar-accdb-linear-solve.js.',
  },
  maxima: {
    hRelativeDelta: maximum('hRelativeDelta'),
    zeroToCaesarMaxFlexRelativeDelta: maximum('zeroToCaesarMaxFlexRelativeDelta'),
    currentToCaesarMinFlexRelativeDelta: maximum('currentToCaesarMinFlexRelativeDelta'),
    zeroToCaesarMaxSifIRelativeDelta: maximum('zeroToCaesarMaxSifIRelativeDelta'),
    currentToCaesarMinSifIRelativeDelta: maximum('currentToCaesarMinSifIRelativeDelta'),
    zeroToCaesarMaxSifORelativeDelta: maximum('zeroToCaesarMaxSifORelativeDelta'),
    currentToCaesarMinSifORelativeDelta: maximum('currentToCaesarMinSifORelativeDelta'),
  },
  rows,
};
writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`);
writeFileSync(mdOut, markdown(result));
console.log(JSON.stringify(result, null, 2));

function calculate(common, pressure, id) {
  const result = calculateB31Factors({
    schema: FACTOR_CALCULATION_REQUEST_SCHEMA,
    calculationId: id,
    componentId: id,
    editionProfileId: 'B31_3_2022_B31J_2017',
    componentType: 'BEND',
    geometry: {
      schema: COMPONENT_GEOMETRY_SCHEMA,
      componentType: 'BEND',
      lengthUnit: 'm',
      ...common,
      pressure,
      sourceEvidence: { sourceId: 'BM4L-CAESAR-MISC-FACTOR-LEDGER', sourceRevision: '179c4831cf521cf797c13699cfbbd118315c9244' },
    },
    momentDirectionMapping: { inPlaneField: 'my', outOfPlaneField: 'mz' },
    semanticHash: '',
  });
  if (result.status !== 'QUALIFIED') throw new Error(`${id} factor calculation blocked: ${JSON.stringify(result.diagnostics)}`);
  return result;
}

function factorSummary(result) {
  return {
    flexibility: result.factors.flexibility.inPlane,
    sifInPlane: result.factors.displacementSifs.inPlaneBending,
    sifOutOfPlane: result.factors.displacementSifs.outOfPlaneBending,
    flexibilityDenominator: result.factors.pressureCorrection.flexibilityDenominator,
    sifDenominator: result.factors.pressureCorrection.sifDenominator,
  };
}

function parseCaesarBends(text) {
  const map = new Map();
  const line = /^\s*(\d+)\s+(\S+)\s+([0-9.]+)\s+([0-9.]+)->\s*([0-9.]+)\s+([0-9.]+)->\s*([0-9.]+)\s+([0-9.]+)->\s*([0-9.]+)\s+([0-9.]+)->\s*([0-9.]+)\s+([0-9.]+)->\s*([0-9.]+)/gmu;
  for (const match of text.matchAll(line)) {
    const [node, flange, h, sifILow, sifIHigh, sifOLow, sifOHigh, sifTLow, sifTHigh, flexILow, flexIHigh, flexOLow, flexOHigh] = match.slice(1);
    if (flange !== 'None') throw new Error(`Unexpected flange condition ${flange} at bend ${node}.`);
    const row = {
      bendNode: node,
      flange,
      h: Number(h),
      sifILow: Number(sifILow), sifIHigh: Number(sifIHigh),
      sifOLow: Number(sifOLow), sifOHigh: Number(sifOHigh),
      sifTLow: Number(sifTLow), sifTHigh: Number(sifTHigh),
      flexLow: Number(flexILow), flexHigh: Number(flexIHigh),
      flexOutLow: Number(flexOLow), flexOutHigh: Number(flexOHigh),
    };
    map.set(node, row);
  }
  return map;
}

function bestCandidate(target, candidates) {
  return Object.entries(candidates)
    .map(([name, result]) => ({ name, value: result.factors.flexibility.inPlane, absoluteDelta: Math.abs(result.factors.flexibility.inPlane - target) }))
    .sort((a, b) => a.absoluteDelta - b.absoluteDelta)[0];
}

function relativeDelta(actual, reference) {
  return (actual - reference) / reference;
}

function markdown(result) {
  const lines = [
    '# BM4_L CAESAR vs LFEA bend factor ledger',
    '',
    `Source ACCDB SHA-256: \`${result.sourceSha256}\``,
    '',
    '| Bend | Src elt | h CII | h LFEA | FLEX CII min→max | FLEX LFEA current / zero | P1 / P1-9 max / Hydro kPa | Best min candidate |',
    '|---:|---:|---:|---:|---:|---:|---:|---|',
  ];
  for (const row of result.rows) {
    lines.push(`| ${row.bendNode} | ${row.sourceElementId} | ${row.caesar.h.toFixed(3)} | ${row.lfea.h.toFixed(6)} | ${row.caesar.flexLow.toFixed(3)}→${row.caesar.flexHigh.toFixed(3)} | ${row.lfea.currentMaxDefined.flexibility.toFixed(6)} / ${row.lfea.zero.flexibility.toFixed(6)} | ${row.pressureKpa.p1.toFixed(0)} / ${row.pressureKpa.p1p9Max.toFixed(0)} / ${row.pressureKpa.hydro.toFixed(0)} | ${row.comparison.bestPressureCandidateByFlex.name} |`);
  }
  lines.push('', '## Maximum relative deltas', '', '```json', JSON.stringify(result.maxima, null, 2), '```', '');
  return `${lines.join('\n')}\n`;
}

function parseArgs(values) {
  const out = {};
  for (let i = 0; i < values.length; i += 2) {
    const key = values[i];
    if (!key?.startsWith('--') || values[i + 1] === undefined) throw new Error(`Invalid argument sequence near ${key}.`);
    out[key.slice(2)] = values[i + 1];
  }
  return out;
}
function required(object, key) {
  if (!object[key]) throw new Error(`Missing --${key}.`);
  return object[key];
}
