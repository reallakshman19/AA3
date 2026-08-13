#!/usr/bin/env node
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { canonicalPrettyStringify, semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import { buildCaesarAccdbBenchmarkPackage, requiredCaesarAccdbTables } from '../src/core/fea-benchmarks/caesar-accdb-package.js';
import { extractCaesarAccdbTables } from '../src/core/fea-benchmarks/caesar-accdb-reader.js';
import * as b0Solver from '../src/core/fea-benchmarks/caesar-accdb-friction-solve.js';
import { buildCandidateSource } from './lfea-m047-stage2-direction-only-experiment.mjs';

const PROFILE = 'benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json';
const SOLVER = 'src/core/fea-benchmarks/caesar-accdb-friction-solve.js';
const ACCDB_SHA = '64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8';
const FOCUS = Object.freeze(['20350', '20440', '20550']);
const FORCE_GATE_N = 1e-2;
const MOTION_GATE_M = 1e-10;
const EXPECTED_D1_NORMAL_N = Object.freeze({
  '20350': 347.46867694607124,
  '20440': 579.2395285112234,
  '20550': 614.8925984686272,
});

const norm = (v) => Math.hypot(...(v ?? []));
const deltaNorm = (a, b) => norm((a ?? []).map((v, i) => v - (b ?? [])[i]));

function supportAt(entry, nodeId) {
  const row = entry.supports.find((s) => String(s.nodeId) === nodeId);
  if (!row) throw new TypeError(`iteration ${entry.iteration} missing focus node ${nodeId}`);
  return row;
}

function pick(entry, nodeId) {
  const s = supportAt(entry, nodeId);
  return {
    iteration: entry.iteration,
    gateStatus: entry.gateStatus,
    stateChangeCount: entry.stateChangeCount,
    displacementUpdateNormM: entry.displacementUpdateNormM,
    reactionUpdateNormN: entry.reactionUpdateNormN,
    accelerationApplied: entry.accelerationApplied,
    accelerationFactor: entry.accelerationFactor,
    state: s.state,
    nextState: s.nextState,
    stateChanged: s.stateChanged,
    regime: s.regime,
    normalN: s.normalReactionMagnitudeN,
    capacityN: s.capacityN,
    trialN: s.trialTangentialSpringForceMagnitudeN,
    appliedForceN: s.appliedFrictionForceN,
    appliedMagnitudeN: s.appliedFrictionForceMagnitudeN,
    displacementM: s.relativeTangentialDisplacementM,
    elasticStretchM: s.elasticTangentialStretchM,
    accumulatedSlipM: s.accumulatedSlipM,
    slipIncrementM: s.slipIncrementM,
    slipUpdateM: s.slipUpdateM,
    oppositionCosine: s.oppositionCosine,
    frictionDirectionCosine: s.frictionDirectionCosine,
    slipOppositionCosine: s.slipOppositionCosine,
  };
}

function firstPair(b0, d1, predicate) {
  const count = Math.min(b0.length, d1.length);
  for (let i = 0; i < count; i += 1) if (predicate(b0[i], d1[i])) return i + 1;
  return null;
}

function divergence(b0, d1, nodeId) {
  const B = b0.map((e) => pick(e, nodeId));
  const D = d1.map((e) => pick(e, nodeId));
  const state = (a, b) => a.state !== b.state || a.nextState !== b.nextState || a.regime !== b.regime;
  const first = {
    slipIncrementAny: firstPair(B, D, (a, b) => deltaNorm(a.slipIncrementM, b.slipIncrementM) > 1e-15),
    accumulatedSlipMaterial: firstPair(B, D, (a, b) => deltaNorm(a.accumulatedSlipM, b.accumulatedSlipM) > MOTION_GATE_M),
    displacementMaterial: firstPair(B, D, (a, b) => deltaNorm(a.displacementM, b.displacementM) > MOTION_GATE_M),
    appliedForceMaterial: firstPair(B, D, (a, b) => deltaNorm(a.appliedForceN, b.appliedForceN) > FORCE_GATE_N),
    normalMaterial: firstPair(B, D, (a, b) => Math.abs(a.normalN - b.normalN) > FORCE_GATE_N),
    capacityMaterial: firstPair(B, D, (a, b) => Math.abs(a.capacityN - b.capacityN) > FORCE_GATE_N),
    stateOrRegime: firstPair(B, D, state),
  };
  const anchor = Math.min(...Object.values(first).filter((v) => v !== null));
  const lo = Math.max(1, anchor - 2);
  const hi = Math.min(Math.min(B.length, D.length), anchor + 3);
  return {
    nodeId,
    first,
    window: Array.from({ length: hi - lo + 1 }, (_, k) => ({ b0: B[lo + k - 1], d1: D[lo + k - 1] })),
    b0Terminal: B.at(-1),
    d1Terminal: D.at(-1),
  };
}

function globalFirstDirectionDivergence(b0, d1) {
  const count = Math.min(b0.length, d1.length);
  for (let i = 0; i < count; i += 1) {
    const bm = new Map(b0[i].supports.map((s) => [s.restraintId, s]));
    const changed = [];
    for (const ds of d1[i].supports) {
      const bs = bm.get(ds.restraintId);
      if (!bs) continue;
      const slipIncrementDeltaM = deltaNorm(bs.slipIncrementM, ds.slipIncrementM);
      if (slipIncrementDeltaM > 1e-15) changed.push({
        nodeId: String(ds.nodeId), restraintId: ds.restraintId,
        b0State: `${bs.state}->${bs.nextState}`,
        d1State: `${ds.state}->${ds.nextState}`,
        b0Regime: bs.regime,
        d1Regime: ds.regime,
        slipIncrementDeltaM,
        b0SlipIncrementM: bs.slipIncrementM,
        d1SlipIncrementM: ds.slipIncrementM,
        b0DisplacementM: bs.relativeTangentialDisplacementM,
        d1DisplacementM: ds.relativeTangentialDisplacementM,
      });
    }
    if (changed.length) return { iteration: i + 1, changed };
  }
  return null;
}

async function loadD1() {
  const path = resolve(SOLVER);
  const source = buildCandidateSource(readFileSync(path, 'utf8'), path);
  const temp = resolve(tmpdir(), `m047-l7-d1-${process.pid}-${Date.now()}.mjs`);
  writeFileSync(temp, source, 'utf8');
  try { return await import(`${pathToFileURL(temp).href}?d1=${Date.now()}`); }
  finally { try { unlinkSync(temp); } catch {} }
}

function run(module) {
  try {
    const actual = module.solveCaesarAccdbFrictionBenchmark(globalThis.pkg, ['L7'], { profile: module.CAESAR_FRICTION_SOLVER_PROFILE });
    return { status: 'CONVERGED', iterations: actual.mechanics.cases.L7.iterations, rowsHash: semanticHash(actual.cases.L7.rows) };
  } catch (error) {
    if (!Array.isArray(error.iterations)) throw error;
    return { status: 'NONCONVERGED', code: error.code ?? null, iterations: error.iterations, rowsHash: null };
  }
}

const accdb = process.argv[2];
if (!accdb) throw new TypeError('usage: node lfea-m047-stage2-l7-b0-d1-branch-history.mjs <BM4_L.ACCDB> [out.json]');
const profile = JSON.parse(readFileSync(resolve(PROFILE), 'utf8'));
const raw = await extractCaesarAccdbTables({ accdbPath: accdb, tableNames: requiredCaesarAccdbTables(profile) });
globalThis.pkg = buildCaesarAccdbBenchmarkPackage({ rawExport: raw, profile });
if (globalThis.pkg.source.sha256 !== ACCDB_SHA) throw new TypeError(`ACCDB SHA mismatch ${globalThis.pkg.source.sha256}`);

const d1Solver = await loadD1();
const b0 = run(b0Solver);
const d1 = run(d1Solver);
if (b0.status !== 'NONCONVERGED' || b0.code !== 'CAESAR_ACCDB_FRICTION_NOT_CONVERGED' || b0.iterations.length !== 400) {
  throw new TypeError(`B0 boundary changed: ${b0.status}/${b0.code}/${b0.iterations.length}`);
}
if (d1.status !== 'CONVERGED') throw new TypeError(`D1 L7 did not converge: ${d1.status}`);
for (const nodeId of FOCUS) {
  const finalNormal = supportAt(d1.iterations.at(-1), nodeId).normalReactionMagnitudeN;
  if (Math.abs(finalNormal - EXPECTED_D1_NORMAL_N[nodeId]) > 1e-6) {
    throw new TypeError(`D1 receipt mismatch at ${nodeId}: ${finalNormal}`);
  }
}

const record0 = {
  schema: 'm047-bm4l-stage2-l7-b0-d1-branch-history/v1',
  sourceAccdbSha256: globalThis.pkg.source.sha256,
  caseId: 'L7',
  comparison: 'B0_PRODUCTION_VS_D1_TOTAL_DISPLACEMENT_DIRECTION_ONLY',
  guards: { loadStepping: false, mechanicsAdded: false, toleranceChanged: false, nodeExceptions: false },
  thresholds: { forceMaterialN: FORCE_GATE_N, motionMaterialM: MOTION_GATE_M },
  b0: { status: b0.status, code: b0.code, iterationCount: b0.iterations.length },
  d1: { status: d1.status, iterationCount: d1.iterations.length, rowsSemanticHash: d1.rowsHash },
  globalFirstSlipDirectionDivergence: globalFirstDirectionDivergence(b0.iterations, d1.iterations),
  focus: FOCUS.map((nodeId) => divergence(b0.iterations, d1.iterations, nodeId)),
  rawTraces: {
    b0: FOCUS.map((nodeId) => ({ nodeId, iterations: b0.iterations.map((e) => pick(e, nodeId)) })),
    d1: FOCUS.map((nodeId) => ({ nodeId, iterations: d1.iterations.map((e) => pick(e, nodeId)) })),
  },
};
const record = { ...record0, semanticHash: semanticHash(record0) };
const text = `${canonicalPrettyStringify(record)}\n`;
if (process.argv[3]) writeFileSync(resolve(process.argv[3]), text, 'utf8');
process.stdout.write(text);
