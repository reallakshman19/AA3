#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const engineering = fs.readFileSync('src/workspace/engineering-model-controller.js', 'utf8');
const loadCalc = fs.readFileSync('src/workspace/load-calc-consumer-controller.js', 'utf8');
const topologyRuntime = fs.readFileSync('src/workspace/topology-edit/topology-edit-check-runtime.js', 'utf8');
const main = fs.readFileSync('src/main.js', 'utf8');

function section(source, start, end) {
  const i = source.indexOf(start);
  assert.notEqual(i, -1, `Missing section start: ${start}`);
  const j = source.indexOf(end, i + start.length);
  assert.notEqual(j, -1, `Missing section end: ${end}`);
  return source.slice(i, j);
}

const projectHandler = section(engineering, '  handleProjectDataChanged(', '  handleMasterDataChanged(');
const masterHandler = section(engineering, '  handleMasterDataChanged(', '  calculate() {');
const loadChangeHandler = section(loadCalc, '  handleEngineeringChange(', '  handleFailure(');
const topologyBasis = section(topologyRuntime, '  const basisKey = semanticHash({', '  if (cachedSnapshot && cachedBasisKey === basisKey)');
const v3Subscription = section(main, '  EventBus.subscribe(ENGINEERING_MODEL_EVENTS.CHANGED', '  EventBus.subscribe(TOPOLOGY_EVENTS.CHANGED');

for (const token of [
  "'topology.supportSiteGroupingToleranceMm'",
  "'topology.portMatchToleranceMm'",
  "'topology.autoCarrierCoincidenceToleranceMm'",
  "'topology.routeJoiningRules'",
]) assert.ok(engineering.includes(token), `Missing Project Data dependency ${token}`);
assert.match(projectHandler, /if \(topologyModelChanged && dataset\)/u);
assert.match(projectHandler, /engineeringModelStore\.markEmpiricalStale\('PROJECT_DATA_CHANGED'/u);
assert.match(projectHandler, /authorizedConsumerController\.refreshEmpirical\(\)/u);
assert.match(projectHandler, /reason: 'authorization-changed'/u);
assert.match(projectHandler, /governingChange: 'project-data-changed'/u);
console.log('PASS D01 Project Data rebuild is dependency-directed while empirical authority always refreshes.');

assert.doesNotMatch(masterHandler, /engineeringModelStore\.rebuild/u);
assert.match(masterHandler, /engineeringModelStore\.markEmpiricalStale\('MASTER_DATA_CHANGED'/u);
assert.match(masterHandler, /authorizedConsumerController\.refreshEmpirical\(\)/u);
assert.match(masterHandler, /reason: 'authorization-changed'/u);
assert.match(masterHandler, /governingChange: 'master-data-changed'/u);
console.log('PASS D02 master changes cannot rebuild support/route models or publish a topology-refresh reason.');

assert.match(loadChangeHandler, /if \(reason === 'project-data-changed' \|\| reason === 'master-data-changed'\)/u);
assert.match(loadChangeHandler, /void this\.refreshTopologyCheck\(\)/u);
assert.doesNotMatch(loadChangeHandler, /governingChange/u);
console.log('PASS D03 existing LoadCalc refresh branch remains isolated from routed authorization changes.');

for (const token of [
  'datasetId:', 'datasetVersion:', 'sourceSha256:',
  'topologyGraphSemanticHash:', 'attachmentModelSemanticHash:',
  'restraintModelSemanticHash:', 'exactToleranceMm,',
]) assert.ok(topologyBasis.includes(token), `Topology basis lost ${token}`);
for (const forbidden of ['masterData', 'projectData', 'lineList', 'pipingClass', 'weight']) {
  assert.ok(!topologyBasis.includes(forbidden), `False topology dependency introduced: ${forbidden}`);
}
console.log('PASS D04 canonical topology-check dependency basis is unchanged and master/project independent.');

assert.match(v3Subscription, /\(\{ reason, governingChange \}\)/u);
assert.match(v3Subscription, /const effectiveChange = governingChange \|\| reason;/u);
assert.match(v3Subscription, /effectiveChange === 'project-data-changed'/u);
assert.match(v3Subscription, /effectiveChange === 'master-data-changed'/u);
console.log('PASS D05 Empirical V3 governing-change invalidation remains fail-closed.');

assert.doesNotMatch(engineering, /reason: 'project-data-changed'/u);
assert.doesNotMatch(engineering, /reason: 'master-data-changed'/u);
console.log('PASS D06 engineering controller no longer emits false topology-refresh reasons.');

console.log('DEPENDENCY INVALIDATION STRUCTURAL STATUS: PASS');
