import { readFileSync } from 'node:fs';

const workflow = readFileSync(
  '.github/workflows/topology-edit-real-user-reachability.yml',
  'utf8',
);
const checker = readFileSync(
  'scripts/topology-edit-r1-line-budget-check.mjs',
  'utf8',
);

if (/TOPOLOGY_EDIT_R1_BASE_SHA:\s+[0-9a-f]{40}/u.test(workflow)) {
  throw new Error('R1 workflow must not pin the line-budget comparison to a historical SHA.');
}
if (!workflow.includes('github.event.pull_request.base.sha')) {
  throw new Error('R1 workflow must supply the current pull request base SHA.');
}
if (/ddc0d87aa5e1a02cb8b5bf10e71dbb1fb1ce9fb3/u.test(checker)) {
  throw new Error('R1 checker must not retain the historical baseline fallback.');
}
if (!checker.includes("git('merge-base', 'HEAD', ref)")) {
  throw new Error('R1 checker must derive a merge-base for manual execution.');
}

process.stdout.write('R1 line-budget base source guard passed.\n');
