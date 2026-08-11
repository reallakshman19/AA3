import assert from 'node:assert/strict';
import fs from 'node:fs';

const intake = fs.readFileSync('src/workspace/lfea-source-intake.js', 'utf8');
const capture = fs.readFileSync('src/workspace/lfea-topology-edit-source-capture.js', 'utf8');
const combined = `${intake}\n${capture}`;

for (const forbidden of [
  /WorkspaceState/u,
  /EventBus/u,
  /swapDataset/u,
  /commitTopologyEditWorkspace/u,
  /commitPreparedTopologyEditExport/u,
  /sharedModel\.supports/u,
]) {
  assert.doesNotMatch(combined, forbidden);
}
assert.match(capture, /createDraftPackage/u);
assert.match(capture, /prepareExport/u);
assert.match(capture, /sessionVersion/u);
assert.match(capture, /LFEA_SOURCE_CAPTURE_VERSION_MOVED/u);
assert.match(capture, /LFEA_SOURCE_CAPTURE_TOPOLOGY_MOVED/u);
assert.match(intake, /TOPOLOGY_EDIT_SNAPSHOT/u);
assert.match(intake, /INPUTXML_FILE/u);
assert.match(intake, /STAGED_JSON_FILE/u);

console.log('lfea-source-intake-source-guard: PASS');
