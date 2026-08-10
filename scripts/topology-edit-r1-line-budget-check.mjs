import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const LIMIT = 300;

/**
 * The comparison point is the merge base with the target branch, so the check
 * measures what this change contributes rather than everything that has landed
 * since a fixed historical commit. Pinning it to one old SHA made the check
 * report the same accumulated violations on every branch, including on the
 * target branch itself, which is indistinguishable from noise.
 */
function defaultBase() {
  for (const ref of ['origin/main', 'main']) {
    try {
      return execFileSync('git', ['merge-base', ref, 'HEAD'], { encoding: 'utf8' }).trim();
    } catch { /* try the next ref */ }
  }
  return 'ddc0d87aa5e1a02cb8b5bf10e71dbb1fb1ce9fb3';
}

const BASE = process.env.TOPOLOGY_EDIT_R1_BASE_SHA || defaultBase();

const changed = execFileSync(
  'git',
  ['diff', '--name-status', `${BASE}...HEAD`],
  { encoding: 'utf8' },
).trim().split('\n').filter(Boolean);

const touched = changed
  .map((line) => line.split('\t'))
  .filter(([status, path]) => /^[AM]$/u.test(status) && /\.(?:js|mjs)$/u.test(path))
  .map(([status, path]) => ({ status, path }))
  .sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));

function physicalLines(text) {
  return text === '' ? 0 : text.replace(/\n$/u, '').split('\n').length;
}

function baseLineCount(path) {
  try {
    return physicalLines(execFileSync('git', ['show', `${BASE}:${path}`], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    }));
  } catch {
    return 0;
  }
}

// Added modules must be inside the budget outright.
//
// Modified modules were previously not inspected at all, which let a module
// grow in place from 41 to 406 lines while this check stayed green. They are
// now inspected too, but a module that was already over the budget at BASE is
// not retroactively failed — that would block every change to the existing
// oversized modules at once. The rule for a modified module is therefore: a
// change may not push it over the budget, and may not grow one that is already
// over. Shrinking an oversized module always passes.
const violations = [];
for (const { status, path } of touched) {
  const lineCount = physicalLines(readFileSync(path, 'utf8'));
  const previous = status === 'A' ? 0 : baseLineCount(path);
  const grandfathered = status === 'M' && previous >= LIMIT;
  const failed = grandfathered ? lineCount > previous : lineCount >= LIMIT;
  if (failed) violations.push({ path, lineCount, previous, grandfathered });
  const suffix = status === 'M' ? ` (was ${previous})` : '';
  process.stdout.write(`${path}: ${lineCount} physical lines${suffix}\n`);
}

if (violations.length) {
  process.stderr.write(
    `Issue #907 line budget failed: JS/test modules must be <${LIMIT} physical lines, `
    + 'and a module already over the budget may not grow.\n',
  );
  for (const row of violations) {
    process.stderr.write(row.grandfathered
      ? `- ${row.path}: ${row.lineCount} (grew from ${row.previous}, already over budget)\n`
      : `- ${row.path}: ${row.lineCount}\n`);
  }
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Issue #907 line budget passed for ${touched.length} added/modified JS/test module(s).\n`,
  );
}
