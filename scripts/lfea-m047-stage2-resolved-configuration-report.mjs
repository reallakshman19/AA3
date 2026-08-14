#!/usr/bin/env node
/**
 * Per-case resolved CAESAR configuration report.
 *
 * For every selected case and every governed setting, this emits the value that
 * each authority layer declares, the layer that wins, and why - before any
 * assembly or iteration. Friction is reported as two distinct quantities, the
 * model coefficient and the load-case multiplier, plus their product and the
 * explicit displayed-to-SI friction-stiffness conversion.
 *
 * It runs from the checked-in profile alone, so the resolved table can be
 * reviewed without Windows or the ACCDB binary. Case formulas come from the
 * ACCDB, so they are taken from a supplied benchmark report when available and
 * otherwise from the declared case map in this file, which is marked as such.
 *
 * Usage:
 *   node scripts/lfea-m047-stage2-resolved-configuration-report.mjs
 *     [--profile <profile.json>] [--report <bm4l-report.json>]
 *     [--trans-unit "N./cm."] [--out <resolved-configuration.json>]
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalPrettyStringify, semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import {
  CAESAR_CONFIGURATION_PRECEDENCE,
  CAESAR_CONFIGURATION_PRECEDENCE_DIRECTION,
  resolveCaesarConfigurationLedger,
} from '../src/core/fea-benchmarks/caesar-configuration-authority.js';
import { resolveCaesarFrictionAuthority } from '../src/core/fea-benchmarks/caesar-friction-authority.js';

const DEFAULT_PROFILE_PATH = 'benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json';

/**
 * BM4_L case formulas as printed in the pinned load-case report.
 *
 * These are used only when no benchmark report is supplied. The emitted record
 * states which source was used so a reader can never mistake a declared formula
 * for one read out of the ACCDB.
 */
const DECLARED_BM4L_CASES = Object.freeze([
  { caseId: 'L1', lcaseNumber: 1, caseClass: 'HYD', formula: 'WW+HP' },
  { caseId: 'L2', lcaseNumber: 2, caseClass: 'OPE', formula: 'W' },
  { caseId: 'L3', lcaseNumber: 3, caseClass: 'OPE', formula: 'T1' },
  { caseId: 'L4', lcaseNumber: 4, caseClass: 'OPE', formula: 'P1' },
  { caseId: 'L5', lcaseNumber: 5, caseClass: 'OPE', formula: 'W+T1+P1' },
  { caseId: 'L6', lcaseNumber: 6, caseClass: 'SUS', formula: 'W+P1' },
  { caseId: 'L7', lcaseNumber: 7, caseClass: 'OPE', formula: 'W+T1+P1' },
  { caseId: 'L13', lcaseNumber: 13, caseClass: 'SUS', formula: 'W+P1' },
  { caseId: 'L14', lcaseNumber: 14, caseClass: 'EXP', formula: 'L14=L5-L6' },
  { caseId: 'L15', lcaseNumber: 15, caseClass: 'EXP', formula: 'L15=L7-L13' },
]);

const FILE_LEVEL_SETTINGS = Object.freeze([
  'Z_AXIS_UP',
  'BEND_AXIAL_SHAPE',
  'USE_PRESSURE_STIFFENING',
  'DEFAULT_TRANS_RESTRAINT_STIFF',
  'DEFAULT_ROT_RESTRAINT_STIFF',
  'FRICT_STIF',
  'AMBIENT_TEMPERATURE',
  'DEFAULT_CODE',
]);

const CASE_LEVEL_SETTINGS = Object.freeze([
  'COEFFICIENT_OF_FRICTION_MU',
  'FRICTION_MULTIPLIER',
  'FLEXIBILITY_ELASTIC_MODULUS',
  'RESTRAINT_DIRECTIONAL_BEHAVIOR',
  'BOURDON_PRESSURE',
]);

/** Build the resolved-configuration record for one profile. */
export function buildResolvedConfigurationReport(input) {
  const profile = input.profile;
  const authority = profile.configurationAuthority;
  const cases = input.cases;
  const inputUnitRows = [{ TRANS: input.translationalStiffnessUnit, ROT_STIFF: 'N.m./deg' }];
  const fileLevel = {};
  for (const setting of FILE_LEVEL_SETTINGS) {
    fileLevel[setting] = ledgerRecord(resolveCaesarConfigurationLedger(authority, setting, null));
  }
  const perCase = {};
  for (const caseRecord of cases) {
    const settings = {};
    for (const setting of CASE_LEVEL_SETTINGS) {
      settings[setting] = ledgerRecord(resolveCaesarConfigurationLedger(authority, setting, caseRecord.caseId));
    }
    const friction = resolveCaesarFrictionAuthority({
      authority,
      cases,
      caseId: caseRecord.caseId,
      inputUnitRows,
    });
    perCase[caseRecord.caseId] = {
      lcaseNumber: caseRecord.lcaseNumber,
      caseClass: caseRecord.caseClass,
      formula: caseRecord.formula,
      caseKind: friction.kind,
      settings,
      friction: {
        modelCoefficientOfFriction: friction.coefficient,
        frictionMultiplier: friction.frictionMultiplier,
        effectiveCoefficient: friction.effectiveCoefficient,
        effectiveRule: friction.effectiveRule,
        frictionActive: friction.frictionActive,
        frictionStiffness: friction.frictionStiffness,
        constituents: friction.constituents,
      },
      meaninglessForThisCase: friction.kind === 'DERIVED_COMBINATION'
        ? ['FRICTION_MULTIPLIER', 'FRICT_STIF']
        : [],
      meaninglessReason: friction.kind === 'DERIVED_COMBINATION'
        ? 'A difference combination performs no nonlinear solve, so no friction multiplier or friction stiffness acts on it; its friction state is inherited from both constituents.'
        : null,
    };
  }
  const base = {
    schema: 'm047-bm4l-stage2-resolved-configuration/v1',
    profileId: profile.profileId,
    benchmarkId: profile.benchmarkId,
    caesarVersion: authority.caesarVersion,
    precedence: [...CAESAR_CONFIGURATION_PRECEDENCE],
    precedenceDirection: CAESAR_CONFIGURATION_PRECEDENCE_DIRECTION,
    precedenceStatement: 'overall/global default < individual-file setting < load-case setting < model input',
    precedenceSource: authority.precedenceSource ?? null,
    caseSource: input.caseSource,
    translationalStiffnessUnit: input.translationalStiffnessUnit,
    translationalStiffnessUnitSource: input.translationalStiffnessUnitSource,
    fileLevelSettings: fileLevel,
    cases: perCase,
  };
  return Object.freeze({ ...base, resolvedConfigurationSemanticHash: semanticHash(base) });
}

function ledgerRecord(ledger) {
  return {
    resolvedLevel: ledger.resolved === null ? null : ledger.resolved.level,
    resolvedValue: ledger.resolved === null ? null : ledger.resolved.value,
    resolvedSource: ledger.resolved === null ? null : ledger.resolved.source,
    status: ledger.resolved === null ? 'UNDECLARED' : 'RESOLVED',
    candidates: ledger.candidates.map((entry) => ({
      level: entry.level,
      applicable: entry.applicable,
      declared: entry.declared,
      value: entry.value,
      source: entry.source,
    })),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = parseArguments(process.argv.slice(2));
  const profile = JSON.parse(readFileSync(resolve(args.profilePath), 'utf8'));
  const report = args.reportPath === null
    ? null
    : JSON.parse(readFileSync(resolve(args.reportPath), 'utf8'));
  const cases = report === null
    ? DECLARED_BM4L_CASES
    : report.cases.map((row) => ({
      caseId: row.caseId,
      lcaseNumber: row.lcaseNumber,
      caseClass: row.caseClass,
      formula: row.formula,
    }));
  const record = buildResolvedConfigurationReport({
    profile,
    cases,
    caseSource: report === null
      ? 'DECLARED_FROM_PINNED_LOAD_CASE_REPORT_NOT_READ_FROM_ACCDB_IN_THIS_RUN'
      : `ACCDB_BENCHMARK_REPORT:${report.source?.sha256 ?? 'UNKNOWN'}`,
    translationalStiffnessUnit: args.transUnit,
    translationalStiffnessUnitSource: args.transUnitSupplied
      ? 'SUPPLIED_ON_COMMAND_LINE'
      : 'GOVERNED_BM4_L_INPUT_UNITS_ENFORCED_BY_THE_RESTRAINT_STIFFNESS_GATE',
  });
  write(record, args.outPath);
}

function parseArguments(argv) {
  const accepted = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    if (!argv[index]?.startsWith('--') || argv[index + 1] === undefined) {
      throw new TypeError(`Invalid argument near ${String(argv[index])}.`);
    }
    accepted.set(argv[index], argv[index + 1]);
  }
  const known = new Set(['--profile', '--report', '--trans-unit', '--out']);
  const unknown = [...accepted.keys()].filter((key) => !known.has(key));
  if (unknown.length > 0) throw new TypeError(`Unknown arguments: ${unknown.join(', ')}.`);
  return {
    profilePath: accepted.get('--profile') ?? DEFAULT_PROFILE_PATH,
    reportPath: accepted.get('--report') ?? null,
    transUnit: accepted.get('--trans-unit') ?? 'N./cm.',
    transUnitSupplied: accepted.has('--trans-unit'),
    outPath: accepted.get('--out') ?? null,
  };
}

function write(value, outPath) {
  const content = `${canonicalPrettyStringify(value)}\n`;
  if (outPath === null) {
    process.stdout.write(content);
    return;
  }
  const resolved = resolve(outPath);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, content, 'utf8');
  process.stdout.write(`${resolved}\n`);
}
