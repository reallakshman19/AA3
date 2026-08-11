import { spawnSync } from 'node:child_process';

const mainRef = resolveMainRef();
const headSha = git(['rev-parse', 'HEAD']);
const mainSha = git(['rev-parse', mainRef]);
const counts = git(['rev-list', '--left-right', '--count', `${mainRef}...HEAD`])
  .split(/\s+/u)
  .map(Number);
const [behind, ahead] = counts;

if (!Number.isInteger(behind) || !Number.isInteger(ahead)) {
  throw syncError('LFEA_MAIN_SYNC_COUNT_INVALID', `Could not parse branch divergence: ${counts.join(' ')}`);
}
if (behind !== 0) {
  throw syncError(
    'LFEA_MAIN_SYNC_REQUIRED',
    `Standalone LFEA candidate is ${behind} commit(s) behind ${mainRef}; synchronize before qualification.`,
  );
}

const mergeBase = git(['merge-base', mainRef, 'HEAD']);
const workflowChanges = git(['diff', '--name-only', `${mergeBase}...HEAD`])
  .split(/\r?\n/u)
  .filter(Boolean)
  .filter((file) => file.startsWith('.github/workflows/'));
if (workflowChanges.length) {
  throw syncError(
    'LFEA_STANDALONE_WORKFLOW_SCOPE_PROHIBITED',
    `Standalone separation changed workflow files without stage authorization: ${workflowChanges.join(', ')}`,
  );
}

console.log(JSON.stringify({
  check: 'lfea-standalone-main-sync',
  status: 'PASS',
  mainRef,
  mainSha,
  headSha,
  mergeBase,
  ahead,
  behind,
  workflowChanges: [],
}));

function resolveMainRef() {
  for (const candidate of ['origin/main', 'main']) {
    if (gitStatus(['rev-parse', '--verify', '--quiet', candidate]) === 0) return candidate;
  }
  throw syncError(
    'LFEA_MAIN_REF_UNAVAILABLE',
    'Neither origin/main nor main is available. Fetch the target main ref before standalone qualification.',
  );
}

function git(args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw syncError('LFEA_GIT_COMMAND_FAILED', `git ${args.join(' ')} failed: ${result.stderr?.trim() ?? ''}`);
  }
  return result.stdout.trim();
}

function gitStatus(args) {
  const result = spawnSync('git', args, { encoding: 'utf8', stdio: 'ignore' });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

function syncError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}
