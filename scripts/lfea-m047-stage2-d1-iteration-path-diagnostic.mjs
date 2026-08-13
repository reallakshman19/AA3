#!/usr/bin/env node
/**
 * M047 Stage 2 R2 diagnostic: inspect the accepted D1 iteration path without
 * changing mechanics. Compares every nonlinear iterate's friction-force ledger
 * against the pinned CAESAR L13 reference, with emphasis on the first state-stable
 * iterate versus the fully converged return-mapped state.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { canonicalPrettyStringify, semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import { buildCaesarAccdbBenchmarkPackage, requiredCaesarAccdbTables } from '../src/core/fea-benchmarks/caesar-accdb-package.js';
import { extractCaesarAccdbTables } from '../src/core/fea-benchmarks/caesar-accdb-reader.js';
import { buildD1SolverSource, D1_PROFILE_ID } from './lfea-m047-stage2-friction-d1-total-direction.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const scriptsDir = dirname(scriptPath);
const root = resolve(scriptsDir, '..');
const solverPath = resolve(root, 'src/core/fea-benchmarks/caesar-accdb-friction-solve.js');
const PROFILE_PATH = 'benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json';
const GOAL = 0.1;
const SURFACE_TOL = 0.02;

function vectorsByNode(rows) {
  const map = new Map();
  for (const row of rows) {
    if (row.entityKind !== 'NODE' || row.quantity !== 'FORCE') continue;
    const vector = map.get(String(row.entityId)) ?? {};
    vector[row.component] = Number(row.value);
    map.set(String(row.entityId), vector);
  }
  return map;
}
function norm(v) { return Math.hypot(...v); }
function normalizedState(raw) {
  return raw === 'SLIDING' ? 'SLID' : raw === 'STUCK' || raw === 'LOCKED_AFTER_SLIP' ? 'STUCK' : raw;
}

async function buildDiagnostic({ accdbPath, profilePath = PROFILE_PATH }) {
  const profile = JSON.parse(readFileSync(resolve(profilePath), 'utf8'));
  const rawExport = await extractCaesarAccdbTables({
    accdbPath,
    tableNames: requiredCaesarAccdbTables(profile),
  });
  const benchmarkPackage = buildCaesarAccdbBenchmarkPackage({ rawExport, profile });
  const token = `${process.pid}-${Date.now()}`;
  const tempSolverPath = resolve(dirname(solverPath), `caesar-accdb-friction-solve.r2-${token}.mjs`);
  const patchedSource = buildD1SolverSource(readFileSync(solverPath, 'utf8'));
  const solverSha256 = createHash('sha256').update(patchedSource).digest('hex');
  try {
    writeFileSync(tempSolverPath, patchedSource, 'utf8');
    const solver = await import(`${pathToFileURL(tempSolverPath).href}?r2=${encodeURIComponent(token)}`);
    if (solver.CAESAR_FRICTION_SOLVER_PROFILE.profileId !== D1_PROFILE_ID) {
      throw new Error(`R2 expected accepted D1 profile ${D1_PROFILE_ID}.`);
    }
    const actual = solver.solveCaesarAccdbFrictionBenchmark(benchmarkPackage, ['L13']);
    const evidence = actual.mechanics.cases.L13;
    const ref = vectorsByNode(benchmarkPackage.references.L13.rows);
    const rows = evidence.iterations.map((iteration) => {
      const supports = iteration.supports.map((s) => {
        const rv = ref.get(String(s.nodeId)) ?? {};
        const referenceForce = s.frictionDofs.map((dof) => Number(rv[dof] ?? 0));
        const solvedForce = s.appliedFrictionForceN.map(Number);
        const referenceMagnitude = norm(referenceForce);
        const vectorRelativeError = referenceMagnitude > 0
          ? norm(solvedForce.map((v, i) => v - referenceForce[i])) / referenceMagnitude
          : null;
        const referenceNormal = Math.abs(Number(rv[s.normalDof] ?? 0));
        const referenceCapacity = s.coefficientOfFriction * referenceNormal;
        const referenceUtilisation = referenceCapacity > 0 ? referenceMagnitude / referenceCapacity : null;
        const referenceState = referenceUtilisation === null
          ? 'NONE'
          : referenceUtilisation >= 1 - SURFACE_TOL ? 'SLID' : 'STUCK';
        const solvedState = normalizedState(s.regime);
        return {
          restraintId: s.restraintId,
          nodeId: s.nodeId,
          referenceForceN: referenceForce,
          solvedForceN: solvedForce,
          vectorRelativeError,
          referenceMagnitudeN: referenceMagnitude,
          solvedMagnitudeN: norm(solvedForce),
          referenceNormalN: referenceNormal,
          solvedNormalN: s.normalReactionMagnitudeN,
          referenceUtilisation,
          solvedUtilisation: s.capacityN > 0 ? norm(solvedForce) / s.capacityN : null,
          referenceState,
          solvedRawState: s.regime,
          solvedState,
          stateMatch: referenceState === solvedState,
        };
      });
      const comparable = supports.filter((s) => s.vectorRelativeError !== null);
      return {
        iteration: iteration.iteration,
        gateStatus: iteration.gateStatus,
        failedGates: iteration.failedGates,
        stateChangeCount: iteration.stateChangeCount,
        displacementUpdateNormM: iteration.displacementUpdateNormM,
        reactionUpdateNormN: iteration.reactionUpdateNormN,
        slipResidualNormM: iteration.slipResidualNormM,
        vectorWithinGoal: comparable.filter((s) => s.vectorRelativeError <= GOAL).length,
        vectorWorstRelativeError: Math.max(...comparable.map((s) => s.vectorRelativeError)),
        constitutiveStateMatches: supports.filter((s) => s.stateMatch).length,
        targets: Object.fromEntries(supports
          .filter((s) => ['22140','22220','20710'].includes(String(s.nodeId)))
          .map((s) => [String(s.nodeId), s])),
        supports,
      };
    });
    const firstStateStable = rows.find((r) => r.stateChangeCount === 0) ?? null;
    const converged = rows.at(-1);
    const bestVectorPass = [...rows].sort((a,b) => b.vectorWithinGoal - a.vectorWithinGoal || a.iteration - b.iteration)[0];
    const targetBest = Object.fromEntries(['22140','22220','20710'].map((nodeId) => {
      const best = [...rows].sort((a,b) =>
        a.targets[nodeId].vectorRelativeError - b.targets[nodeId].vectorRelativeError)[0];
      return [nodeId, {
        iteration: best.iteration,
        vectorRelativeError: best.targets[nodeId].vectorRelativeError,
        solvedMagnitudeN: best.targets[nodeId].solvedMagnitudeN,
        solvedState: best.targets[nodeId].solvedState,
        stateChangeCount: best.stateChangeCount,
      }];
    }));
    const record = {
      schema: 'm047-bm4l-stage2-d1-iteration-path-diagnostic/v1',
      sourceAccdbSha256: benchmarkPackage.source.sha256,
      solverProfileId: D1_PROFILE_ID,
      ephemeralSolverSha256: solverSha256,
      rule: 'DATA_ONLY_INSPECT_ACCEPTED_D1_ITERATION_PATH_NO_MECHANICS_OR_TOLERANCE_CHANGE',
      summary: {
        iterationCount: rows.length,
        firstStateStableIteration: firstStateStable?.iteration ?? null,
        firstStateStableVectorWithinGoal: firstStateStable?.vectorWithinGoal ?? null,
        firstStateStableConstitutiveStateMatches: firstStateStable?.constitutiveStateMatches ?? null,
        convergedVectorWithinGoal: converged.vectorWithinGoal,
        convergedConstitutiveStateMatches: converged.constitutiveStateMatches,
        bestVectorPassIteration: bestVectorPass.iteration,
        bestVectorPassCount: bestVectorPass.vectorWithinGoal,
        targetBest,
      },
      iterations: rows,
    };
    return { ...record, diagnosticSemanticHash: semanticHash(record) };
  } finally {
    try { rmSync(tempSolverPath, { force: true }); } catch { /* cleanup only */ }
  }
}

function parse(argv) {
  const args = new Map();
  for (let i=0; i<argv.length; i+=2) args.set(argv[i], argv[i+1]);
  const accdbPath=args.get('--accdb');
  if (!accdbPath) throw new TypeError('Usage: --accdb <BM4_L.ACCDB> [--out <json>]');
  return {accdbPath, profilePath:args.get('--profile'), outPath:args.get('--out') ?? null};
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  const args=parse(process.argv.slice(2));
  const record=await buildDiagnostic(args);
  if (args.outPath) {
    const out=resolve(args.outPath); mkdirSync(dirname(out),{recursive:true}); writeFileSync(out,`${canonicalPrettyStringify(record)}\n`,'utf8');
  }
  process.stdout.write(`${canonicalPrettyStringify(record.summary)}\n`);
}

export { buildDiagnostic };
