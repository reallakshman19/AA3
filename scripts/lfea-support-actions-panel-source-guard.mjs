import assert from 'node:assert/strict';
import fs from 'node:fs';

const eventTopics = fs.readFileSync('src/workspace/event-topics.js', 'utf8');
const propertiesPanel = fs.readFileSync('src/workspace/properties-panel.js', 'utf8');
const supportPanel = fs.readFileSync('src/workspace/lfea-support-actions-panel.js', 'utf8');
const lifecycle = fs.readFileSync('src/workspace/topology-edit/topology-edit-lifecycle-controller.js', 'utf8');
const sjsonController = fs.readFileSync('src/workspace/topology-edit-3d-sjson-fidelity-controller.js', 'utf8');

assert.match(eventTopics, /LFEA_SUPPORT_ACTIONS_PUBLISHED/u);
assert.match(eventTopics, /TOPOLOGY_EDIT_LFEA_SOURCE_CHANGED/u);
assert.match(eventTopics, /validateLfeaSupportActionsPublished/u);
assert.match(eventTopics, /validateTopologyEditLfeaSourceChanged/u);
assert.match(propertiesPanel, /subscribe\(EVENT_TOPICS\.LFEA_SUPPORT_ACTIONS_PUBLISHED/u);
assert.match(propertiesPanel, /subscribe\(EVENT_TOPICS\.TOPOLOGY_EDIT_LFEA_SOURCE_CHANGED/u);
assert.match(propertiesPanel, /subscribe\(EVENT_TOPICS\.WORKSPACE_SNAPSHOT_CHANGED/u);
assert.match(propertiesPanel, /renderLfeaSupportActions/u);
assert.match(lifecycle, /publishLfeaSourceContextEvent\(payload\)/u);
assert.match(lifecycle, /session\.journal\.sessionVersion/u);
assert.match(lifecycle, /session\.currentTopology\(\)\.canonicalTopologyHash/u);
assert.doesNotMatch(lifecycle, /from ['"]\.\.\/event-bus\.js['"]/u);
assert.doesNotMatch(lifecycle, /from ['"]\.\.\/event-topics\.js['"]/u);
assert.match(sjsonController, /publishLfeaSourceContext:/u);
assert.match(sjsonController, /eventBus\.publish\(EVENT_TOPICS\.TOPOLOGY_EDIT_LFEA_SOURCE_CHANGED/u);

for (const [label, source] of [
  ['properties-panel', propertiesPanel],
  ['lfea-support-actions-panel', supportPanel],
]) {
  assert.doesNotMatch(source, /linear-fea-solver/u, `${label} must not import solver authority.`);
  assert.doesNotMatch(source, /linear-piping-interface\/recovery/u, `${label} must not import recovery authority.`);
  assert.doesNotMatch(source, /sharedModel\.supports/u, `${label} must not mutate shared-model supports.`);
  assert.doesNotMatch(source, /swapDataset|loadDataset\s*\(/u, `${label} must not mutate workspace geometry.`);
}
assert.doesNotMatch(supportPanel, /\bforceLocal\b/u);
assert.match(supportPanel, /No recovered action for this selection\./u);
assert.match(supportPanel, /Blocked — axial parallel to vertical/u);

console.log('lfea-support-actions-panel-source-guard: PASS');
