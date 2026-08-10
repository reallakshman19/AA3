import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const LIMIT = 300;

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function resolveBase() {
  const configured = process.env.TOPOLOGY_EDIT_R1_BASE_SHA?.trim();
  if (configured) return configured;

  for (const ref of ['origin/main', 'main']) {
    try {
      const mergeBase = git('merge-base', 'HEAD', ref);
      if (mergeBase) {
        process.stdout.write(
          `Issue #907 line budget: TOPOLOGY_EDIT_R1_BASE_SHA unset; using merge-base with ${ref}: ${mergeBase}\n`,
        );
        return mergeBase;
      }
    } catch {
      // Try the next local main reference. Manual runs must fail closed if none exists.
    }
  }

  throw new Error(
    'Issue #907 line budget requires TOPOLOGY_EDIT_R1_BASE_SHA or a resolvable origin/main or main merge-base.',
  );
}

const BASE = resolveBase();
process.stdout.write(`Issue #907 line budget base: ${BASE}\n`);

const changedText = git('diff', '--name-status', `${BASE}...HEAD`);
const changed = changedText === '' ? [] : changedText.split('\n').filter(Boolean);

const addedModules = changed
  .map((line) => line.split('\t'))
  .filter(([status, path]) => status === 'A' && /\.(?:js|mjs)$/u.test(path))
  .map(([, path]) => path)
  .sort();

const violations = [];
for (const path of addedModules) {
  const text = readFileSync(path, 'utf8');
  const lineCount = text === '' ? 0 : text.replace(/\n$/u, '').split('\n').length;
  if (lineCount >= LIMIT) violations.push({ path, lineCount });
  process.stdout.write(`${path}: ${lineCount} physical lines\n`);
}

if (violations.length) {
  process.stderr.write(
    `Issue #907 line budget failed: new JS/test modules must be <${LIMIT} physical lines.\n`,
  );
  for (const row of violations) {
    process.stderr.write(`- ${row.path}: ${row.lineCount}\n`);
  }
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Issue #907 line budget passed for ${addedModules.length} new JS/test module(s).\n`,
  );
}
