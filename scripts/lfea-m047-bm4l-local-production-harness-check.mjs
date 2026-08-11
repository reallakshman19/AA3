import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync('.github/workflows/m047-bm4l-qualification.yml', 'utf8');
const harness = fs.readFileSync('scripts/lfea-m047-bm4l-local-production.ps1', 'utf8');

const constants = {
  commonCommit: '45d51ea18624f5775805f399110c1738301c0d90',
  zipSha256: '978617cba50fa0b1a16c2fa71dc1e0d38e55ac834b191f887d100c6951abd8b9',
  zipSize: '582488',
  memberSha256: '64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8',
  declaredSha256: 'e21b0862851ea2bb6f20d55e4a3a94f501537b618b98dd46afa9f6777ee38d3c',
  accdbSize: '5136384',
  aceSha256: '04e96c9f1a1f7d251a88aececf1dc10ff65950392787427c00814a43308003de',
};
for (const [name, value] of Object.entries(constants)) {
  assert.ok(workflow.includes(value), `workflow missing ${name}`);
  assert.ok(harness.includes(value), `harness missing ${name}`);
}

assert.match(workflow, /workflow_dispatch:/u);
assert.match(workflow, /runs-on:\s*windows-latest/u);
assert.match(harness, /\[Parameter\(Mandatory = \$true\)\][\s\S]*\$ExpectedHead/u);
assert.match(harness, /git rev-parse HEAD/u);
assert.match(harness, /git status --porcelain=v1 --untracked-files=all/u);
assert.match(harness, /Exact-head mismatch/u);
assert.match(harness, /requires a clean worktree/u);
assert.match(harness, /Node 22 is required/u);
assert.match(harness, /Microsoft\.ACE\.OLEDB\.12\.0/u);
assert.match(harness, /Get-AuthenticodeSignature/u);
assert.match(harness, /providerOpenChangedBytes/u);

const requiredFragments = [
  'scripts/lfea-caesar-accdb-benchmark.mjs',
  '--solve-cases L2,L3,L4,L5,L6,L14',
  'scripts/lfea-bm4l-root-cause-report.mjs',
  'scripts/lfea-m047-bm4l-root-cause-diagnostics.mjs',
  'scripts/lfea-m047-bm4l-recovery-proof.mjs',
  'scripts/lfea-m047-bm4l-numeric-operator-proof.mjs',
  'scripts/lfea-m047-bm4l-bend-effective-stiffness.mjs',
  'scripts/lfea-accdb-bend-gravity-first-moment.mjs',
  'src/core/fea-benchmarks/qualification-engineering-assessment.js',
  'check:lfea-b3.3',
  'check:lfea-b3.4',
  'check:lfea-b3.8',
  'check:lfea-b3.9',
  'check:lfea-b3.22',
  'check:lfea-b3.23',
  'check:core-fea',
];
for (const fragment of requiredFragments) {
  assert.ok(workflow.includes(fragment), `workflow missing ${fragment}`);
  assert.ok(harness.includes(fragment), `harness missing ${fragment}`);
}

assert.match(harness, /m047-bm4l-local-production-qualification\/v1/u);
assert.match(harness, /caseFailures/u);
assert.match(harness, /qualification\.totals/u);
assert.match(harness, /qualification\.semanticHash/u);
assert.match(harness, /engineeringAssessment/u);
assert.match(harness, /physicalEquilibrium\.status -ne 'PASS'/u);
assert.match(harness, /linearCaseConditioning\.status -ne 'PASS'/u);

for (const forbidden of [
  'gh workflow run',
  'zeroReferenceAbsolute =',
  'relative = 0.1',
  'expectedFailure',
  'expectedCount',
]) {
  assert.ok(!harness.includes(forbidden), `harness contains forbidden result/tolerance coupling: ${forbidden}`);
}

console.log('PASS m047 BM4_L local production harness contract');
