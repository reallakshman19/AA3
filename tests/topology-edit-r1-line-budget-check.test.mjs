import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const CHECKER = fileURLToPath(
  new URL('../scripts/topology-edit-r1-line-budget-check.mjs', import.meta.url),
);

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function lines(count) {
  return `${Array.from({ length: count }, (_, index) => `// line ${index + 1}`).join('\n')}\n`;
}

function createRepo() {
  const cwd = mkdtempSync(join(tmpdir(), 'topology-edit-r1-line-budget-'));
  git(cwd, 'init', '-b', 'main');
  git(cwd, 'config', 'user.email', 'ci@example.invalid');
  git(cwd, 'config', 'user.name', 'CI Test');
  writeFileSync(join(cwd, 'legacy-large.js'), lines(500));
  git(cwd, 'add', '.');
  git(cwd, 'commit', '-m', 'baseline');
  const base = git(cwd, 'rev-parse', 'HEAD');
  git(cwd, 'checkout', '-b', 'feature');
  return { cwd, base };
}

function runChecker(cwd, base) {
  const env = { ...process.env };
  if (base === undefined) delete env.TOPOLOGY_EDIT_R1_BASE_SHA;
  else env.TOPOLOGY_EDIT_R1_BASE_SHA = base;
  return spawnSync(process.execPath, [CHECKER], {
    cwd,
    env,
    encoding: 'utf8',
  });
}

function addAndCommit(cwd, path, lineCount) {
  writeFileSync(join(cwd, path), lines(lineCount));
  git(cwd, 'add', path);
  git(cwd, 'commit', '-m', `add ${path}`);
}

test('ignores oversized modules that predate the PR base', () => {
  const { cwd, base } = createRepo();
  try {
    addAndCommit(cwd, 'new-small.mjs', 299);
    const result = runChecker(cwd, base);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /new-small\.mjs: 299 physical lines/u);
    assert.doesNotMatch(result.stdout, /legacy-large\.js/u);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('rejects a newly added module at the 300-line boundary', () => {
  const { cwd, base } = createRepo();
  try {
    addAndCommit(cwd, 'new-boundary.js', 300);
    const result = runChecker(cwd, base);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /new-boundary\.js: 300/u);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('rejects a newly added oversized module', () => {
  const { cwd, base } = createRepo();
  try {
    addAndCommit(cwd, 'new-large.mjs', 500);
    const result = runChecker(cwd, base);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /new-large\.mjs: 500/u);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('manual execution falls back to the merge-base with main', () => {
  const { cwd } = createRepo();
  try {
    addAndCommit(cwd, 'manual-small.js', 20);
    const result = runChecker(cwd);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /using merge-base with main/u);
    assert.match(result.stdout, /manual-small\.js: 20 physical lines/u);
    assert.doesNotMatch(result.stdout, /legacy-large\.js/u);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
