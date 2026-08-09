import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { canonicalPrettyStringify } from '../src/core/shared-piping-model/canonical-json.js';
import { buildCaesarAccdbIterationEvidence } from '../src/core/fea-benchmarks/caesar-accdb-iteration-evidence.js';

const REQUEST_SCHEMA = 'lfea-caesar-accdb-iteration-request/v1';

export function runCaesarAccdbIteration(input) {
  const report = readJson(input.reportPath, 'ACCDB benchmark report');
  const request = readJson(input.metaPath, 'iteration metadata');
  if (request?.schema !== REQUEST_SCHEMA) {
    throw new TypeError(`Iteration metadata must use ${REQUEST_SCHEMA}.`);
  }
  const parentEvidence = input.parentPath === null
    ? null
    : readJson(input.parentPath, 'parent iteration evidence');
  return buildCaesarAccdbIterationEvidence({
    ...request,
    report,
    parentEvidence,
  });
}

function parseArguments(argv) {
  const accepted = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new TypeError(`Invalid command argument near ${String(key)}.`);
    }
    if (accepted.has(key)) throw new TypeError(`Duplicate command argument ${key}.`);
    accepted.set(key, value);
  }
  const known = new Set(['--report', '--meta', '--parent', '--out', '--summary-out']);
  const unknown = [...accepted.keys()].filter((key) => !known.has(key));
  if (unknown.length > 0) throw new TypeError(`Unknown command arguments: ${unknown.join(', ')}.`);
  const reportPath = accepted.get('--report');
  const metaPath = accepted.get('--meta');
  const outPath = accepted.get('--out');
  if (!reportPath || !metaPath || !outPath) {
    throw new TypeError(
      'Usage: --report <benchmark-report.json> --meta <iteration-request.json> '
      + '[--parent <iteration.json>] --out <iteration.json> [--summary-out <summary.md>].',
    );
  }
  return Object.freeze({
    reportPath,
    metaPath,
    parentPath: accepted.get('--parent') ?? null,
    outPath,
    summaryOutPath: accepted.get('--summary-out') ?? null,
  });
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(resolve(path), 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read ${label} ${path}: ${error.message}`, { cause: error });
  }
}

function writeJson(value, path) {
  const resolved = resolve(path);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, canonicalPrettyStringify(value), 'utf8');
  return resolved;
}

function writeSummary(evidence, path) {
  const resolved = resolve(path);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, renderSummary(evidence), 'utf8');
  return resolved;
}

function renderSummary(evidence) {
  const lines = [
    `# ${evidence.iterationId} — ${evidence.decision.verdict}`,
    '',
    `- Issue: ${evidence.issueId}`,
    `- Benchmark: ${evidence.benchmarkId}`,
    `- Parent: ${evidence.parentIterationId ?? 'none'}`,
    `- ACCDB SHA-256: \`${evidence.source.accdbSha256}\``,
    `- Base commit: \`${evidence.git.baseCommitSha}\``,
    `- Candidate commit: ${evidence.git.candidateCommitSha ? `\`${evidence.git.candidateCommitSha}\`` : 'not recorded'}`,
    `- Evidence hash: \`${evidence.semanticHash}\``,
    '',
    '## Hypothesis',
    '',
    evidence.experiment.hypothesis,
    '',
    '## Predicted signature',
    '',
    ...evidence.experiment.predictedSignature.map((row) => `- ${row}`),
    '',
    '## Mechanics delta',
    '',
    evidence.experiment.mechanicsDelta,
    '',
    '## Scorecard',
    '',
    '| Case | Restraint fails | Displacement/rotation fails | Source end-action fails | Max force closure (N) | Max moment closure (N·m) |',
    '|---|---:|---:|---:|---:|---:|',
  ];
  for (const [caseId, metrics] of Object.entries(evidence.metrics)) {
    lines.push(
      `| ${caseId} | ${metrics.restraints.failingComponentCount} | ${metrics.displacement.failingComponentCount} | ${metrics.sourceEndActions.failingComponentCount} | ${format(metrics.equilibrium.maximumAbsoluteForceResidualN)} | ${format(metrics.equilibrium.maximumAbsoluteMomentResidualNm)} |`,
    );
  }
  lines.push('', '## Invariants', '');
  lines.push(`- Bend coverage: ${evidence.invariants.bendCoverage ? 'PASS' : 'FAIL'}`);
  lines.push(`- Actual nodal equilibrium: ${evidence.invariants.nodalEquilibrium ? 'PASS' : 'FAIL'}`);
  lines.push(`- Execution hashes present: ${evidence.invariants.executionHashesPresent ? 'PASS' : 'FAIL'}`);

  if (evidence.improvements !== null) {
    lines.push('', '## Change from parent', '');
    for (const [caseId, families] of Object.entries(evidence.improvements.failures.cases)) {
      lines.push(`### ${caseId}`, '');
      for (const [family, result] of Object.entries(families)) {
        lines.push(
          `- ${family}: ${signed(result.netDelta)} net failures; ${result.resolvedCount} resolved; ${result.introducedCount} introduced.`,
        );
        if (result.resolved.length > 0) lines.push(`  - Resolved: ${result.resolved.join(', ')}`);
        if (result.introduced.length > 0) lines.push(`  - Introduced: ${result.introduced.join(', ')}`);
      }
      lines.push('');
    }
  }

  lines.push('## Decision', '', `${evidence.decision.verdict}: ${evidence.decision.reason}`, '');
  return `${lines.join('\n')}\n`;
}

function signed(value) {
  const number = Number(value);
  return number > 0 ? `+${number}` : String(number);
}

function format(value) {
  const number = Number(value);
  if (number === 0) return '0';
  if (Math.abs(number) >= 0.001 && Math.abs(number) < 1e7) return Number(number.toFixed(6)).toString();
  return number.toExponential(6);
}

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) {
  try {
    const input = parseArguments(process.argv.slice(2));
    const evidence = runCaesarAccdbIteration(input);
    const written = writeJson(evidence, input.outPath);
    if (input.summaryOutPath !== null) writeSummary(evidence, input.summaryOutPath);
    process.stdout.write(`${written}\n`);
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  }
}
