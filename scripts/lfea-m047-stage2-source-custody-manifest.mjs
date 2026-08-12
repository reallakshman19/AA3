#!/usr/bin/env node
/**
 * M047 Stage 2 source-custody manifest.
 *
 * Emits the immutable remote source set for BM4_L friction qualification: pinned
 * URLs, Git blob hashes, archive and member SHA-256 hashes and byte counts. The
 * ACCDB table/case inventory is filled in only from a real provenance or
 * benchmark report, so the manifest can never claim an inventory it has not seen.
 *
 * Two conflicting ACCDB member hashes exist in the record. Both are retained and
 * the contradiction is stated; the manifest does not silently pick one.
 *
 * Usage:
 *   node scripts/lfea-m047-stage2-source-custody-manifest.mjs [--report <bm4l-report.json>]
 *     [--provenance <bm4l-provenance.json>] [--out <manifest.json>]
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalPrettyStringify, semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import {
  resolveCaesarFrictionAuthorityTable,
} from '../src/core/fea-benchmarks/caesar-friction-authority.js';

const COMMON_REPOSITORY = 'reallaksh19/Common';
const ISSUE_PINNED_COMMON_COMMIT = 'f4d49f2a47d970ae0abf913b537193e324556177';
const HARNESS_PINNED_COMMON_COMMIT = '45d51ea18624f5775805f399110c1738301c0d90';
const PROFILE_PATH = 'benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json';
const CODE_BASELINE_COMMIT = '0855afb22b76c4b7657a81641c7fbaa890474cd7';

const REMOTE_SOURCES = Object.freeze([
  Object.freeze({
    order: 0,
    authority: 'CODE_BASELINE',
    identity: 'PR_1046_EXACT_HEAD_OR_ADOPTED_SUCCESSOR',
    url: `https://github.com/reallaksh19/Advanced_Analysis/tree/${CODE_BASELINE_COMMIT}`,
    commit: CODE_BASELINE_COMMIT,
    role: 'Generic benchmark gates and the qualified linear mechanics this stage must preserve.',
  }),
  Object.freeze({
    order: 1,
    authority: 'ACCDB_ARCHIVE',
    identity: 'BM4_L.zip',
    url: `https://github.com/${COMMON_REPOSITORY}/blob/${ISSUE_PINNED_COMMON_COMMIT}/LFEA/BM4/BM4_L.zip`,
    rawUrl: `https://raw.githubusercontent.com/${COMMON_REPOSITORY}/${ISSUE_PINNED_COMMON_COMMIT}/LFEA/BM4/BM4_L.zip`,
    gitBlobSha1: 'df119ae1b8272469b6204036ab1aff21e561dfb8',
    sha256: '978617cba50fa0b1a16c2fa71dc1e0d38e55ac834b191f887d100c6951abd8b9',
    byteLength: 582488,
    byteLengthSource: 'RECORDED_BY_LOCAL_PRODUCTION_HARNESS_CUSTODY_GATE',
    role: 'Contains exactly BM4_L.ACCDB.',
  }),
  Object.freeze({
    order: 2,
    authority: 'MODEL_AND_RESULT_DATABASE',
    identity: 'BM4_L.ACCDB',
    url: 'zip://BM4_L.zip!/BM4_L.ACCDB',
    byteLength: 5136384,
    role: 'The only model, geometry and result input. BM4_NL and InputXML are excluded.',
  }),
  Object.freeze({
    order: 3,
    authority: 'LOAD_CASE_REPORT',
    identity: 'Loadcasereport_BM4_L.txt',
    url: `https://github.com/${COMMON_REPOSITORY}/blob/${ISSUE_PINNED_COMMON_COMMIT}/LFEA/BM4/Loadcasereport_BM4_L.txt`,
    gitBlobSha1: 'be62eeb08af26dddcd59146e21188c108c4600dd',
    role: 'Authority for case type, formula, combination method and friction multiplier.',
  }),
  Object.freeze({
    order: 4,
    authority: 'MISCELLANEOUS_REPORT',
    identity: 'Miscdata_BM4_L.txt',
    url: `https://github.com/${COMMON_REPOSITORY}/blob/${ISSUE_PINNED_COMMON_COMMIT}/LFEA/BM4/Miscdata_BM4_L.txt`,
    gitBlobSha1: 'ef23d224925e4568185a360ecbe1ee62503f15ff',
    role: 'Printed corroboration only. It may fill a declared report-authority field and may never override ACCDB geometry or results.',
  }),
  Object.freeze({
    order: 5,
    authority: 'BENCHMARK_PROFILE',
    identity: PROFILE_PATH,
    url: `https://github.com/reallaksh19/Advanced_Analysis/blob/${CODE_BASELINE_COMMIT}/${PROFILE_PATH}`,
    role: 'Case selection, tolerance policy, layered configuration authority, mechanics authority and result families.',
  }),
]);

const ADOPTED_AUTHORITY_RECORDS = Object.freeze([
  'benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-native-zero-boundary-authority.json',
  'benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-residual-invariant-authority.json',
  'benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-t1-interval-authority.json',
  'benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-tee-rigid-thermal-authority.json',
  'benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-zero-suppression-crosscheck.json',
]);

const MEMBER_HASH_RECORD = Object.freeze({
  rule: 'PINNED_ARCHIVE_MEMBER_BYTES_ARE_THE_AUTHORITY_AND_BOTH_DECLARATIONS_ARE_RETAINED',
  issueDeclaredSha256: 'e21b0862851ea2bb6f20d55e4a3a94f501537b618b98dd46afa9f6777ee38d3c',
  harnessRecordedSha256: '64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8',
  status: 'CONTRADICTED_DECLARATIONS_PENDING_PRODUCTION_RUN_ARBITRATION',
  arbitration: 'The Windows/ACE production run recomputes the member hash from the pinned ZIP and records which declaration the bytes support.',
});

/** Build the custody manifest, binding inventory only from supplied evidence. */
export function buildSourceCustodyManifest(input = {}) {
  const profile = JSON.parse(readFileSync(resolve(input.profilePath ?? PROFILE_PATH), 'utf8'));
  const report = input.report ?? null;
  const provenance = input.provenance ?? null;
  const inventory = buildInventory(report, provenance);
  const base = {
    schema: 'm047-bm4l-stage2-source-custody-manifest/v1',
    benchmarkId: 'BM4_L',
    profileId: profile.profileId,
    stage: 'M047_STAGE2_FRICTION',
    excludedSources: ['BM4_NL', 'InputXML'],
    commonCommitDeclarations: {
      issuePinned: ISSUE_PINNED_COMMON_COMMIT,
      harnessPinned: HARNESS_PINNED_COMMON_COMMIT,
      reconciliation: 'Both commits publish the same BM4_L.zip SHA-256, so the archive identity is unambiguous even though the commits differ.',
    },
    remoteSources: REMOTE_SOURCES,
    accdbMemberHashRecord: MEMBER_HASH_RECORD,
    adoptedAuthorityRecords: ADOPTED_AUTHORITY_RECORDS,
    caseFrictionAuthority: report === null ? null : frictionAuthorityFromReport(report, profile),
    accdbInventory: inventory,
    intakeOrder: [
      'Pin the code commit and record a clean worktree.',
      'Download the pinned ZIP and verify the archive and member SHA-256 hashes.',
      'Load ACCDB only and validate schema, row counts, case IDs, units, identities and reference equilibrium.',
      'Load the Misc report as corroboration for declared report-authority fields only.',
      'Bind every selected case to its load-case report formula, type, combination method and friction multiplier.',
      'Load and validate the profile/configuration authority.',
      'Emit the resolved per-case configuration table before assembly or iteration.',
      'Run the frozen non-friction controls before accepting any friction result.',
      'Run primitive friction cases L13, L7, then L1, then the derived L15 combination.',
    ],
  };
  return Object.freeze({ ...base, manifestSemanticHash: semanticHash(base) });
}

function frictionAuthorityFromReport(report, profile) {
  const cases = report.cases?.map((row) => ({
    caseId: row.caseId,
    lcaseNumber: row.lcaseNumber,
    caseClass: row.caseClass,
    formula: row.formula,
  })) ?? [];
  if (cases.length === 0) return null;
  const inputUnitRows = report.mechanics?.linear?.inputUnitRows
    ?? [{ TRANS: 'N./cm.', ROT_STIFF: 'N.m./deg' }];
  const table = resolveCaesarFrictionAuthorityTable({
    authority: profile.configurationAuthority,
    cases,
    inputUnitRows,
  });
  return Object.fromEntries(table.caseIds.map((caseId) => [caseId, {
    kind: table.cases[caseId].kind,
    modelCoefficientOfFriction: table.cases[caseId].coefficient.value,
    coefficientLevel: table.cases[caseId].coefficient.level,
    frictionMultiplier: table.cases[caseId].frictionMultiplier.value,
    effectiveCoefficient: table.cases[caseId].effectiveCoefficient,
  }]));
}

function buildInventory(report, provenance) {
  if (report === null && provenance === null) {
    return {
      status: 'NOT_BOUND',
      reason: 'No provenance or benchmark report was supplied; the ACCDB is a Windows/ACE-only binary source.',
      tables: null,
      cases: null,
      source: null,
    };
  }
  return {
    status: 'BOUND',
    reason: null,
    tables: provenance?.tables ?? provenance?.tableInventory ?? null,
    cases: report?.cases?.map((row) => ({
      caseId: row.caseId,
      lcaseNumber: row.lcaseNumber,
      caseClass: row.caseClass,
      formula: row.formula,
      referenceCounts: row.referenceCounts,
      referenceEquilibriumStatus: row.equilibrium?.status ?? null,
    })) ?? null,
    source: {
      sha256: report?.source?.sha256 ?? provenance?.source?.sha256 ?? null,
      byteLength: report?.source?.byteLength ?? provenance?.source?.byteLength ?? null,
      modelInventory: report?.model?.inventory ?? null,
    },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = parseArguments(process.argv.slice(2));
  const manifest = buildSourceCustodyManifest({
    report: args.reportPath === null ? null : readJson(args.reportPath),
    provenance: args.provenancePath === null ? null : readJson(args.provenancePath),
  });
  write(manifest, args.outPath);
}

function parseArguments(argv) {
  const accepted = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    if (!argv[index]?.startsWith('--') || argv[index + 1] === undefined) {
      throw new TypeError(`Invalid argument near ${String(argv[index])}.`);
    }
    accepted.set(argv[index], argv[index + 1]);
  }
  const known = new Set(['--report', '--provenance', '--out']);
  const unknown = [...accepted.keys()].filter((key) => !known.has(key));
  if (unknown.length > 0) throw new TypeError(`Unknown arguments: ${unknown.join(', ')}.`);
  return {
    reportPath: accepted.get('--report') ?? null,
    provenancePath: accepted.get('--provenance') ?? null,
    outPath: accepted.get('--out') ?? null,
  };
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(path), 'utf8'));
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
