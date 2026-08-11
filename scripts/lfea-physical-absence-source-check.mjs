import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('scripts/run-lfea-physical-absence-rehearsal.mjs', 'utf8');

assert.match(source, /discoverLafeaOwnedPaths/u);
assert.match(source, /src\/workspace\/lafea-workbench-controller\.js/u);
assert.match(source, /src\/core\/lafea-linear-solve/u);
assert.match(source, /fs\.renameSync\(sourcePath, targetPath\)/u);
assert.match(source, /finally\s*\{/u);
assert.match(source, /restoreAll\(\)/u);
assert.match(source, /fs\.renameSync\(entry\.targetPath, entry\.sourcePath\)/u);
assert.match(source, /runNode\('scripts\/run-lfea-standalone-check\.mjs'\)/u);
assert.match(source, /runNode\('scripts\/run-lfea-standalone-e2e\.mjs'\)/u);
assert.match(source, /LFEA_PHYSICAL_ABSENCE_REHEARSAL/u);
assert.doesNotMatch(source, /rmSync\(sourcePath|unlinkSync\(sourcePath|rmdirSync\(sourcePath/u);
assert.doesNotMatch(source, /\.github\/workflows/u);
assert.ok(source.split(/\r?\n/u).length < 300);

console.log(JSON.stringify({
  check: 'lfea-physical-absence-source',
  status: 'PASS',
  physicalRenameWitness: true,
  finallyRestore: true,
  standaloneAggregateUnderAbsence: true,
  browserJourneyUnderAbsence: true,
}));
