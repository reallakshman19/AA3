import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  rectangularQ4Package,
  sparseRoundTripPackage,
  t3PlatePackage,
} from './lfea-005-fixtures.mjs';
import {
  createLfeaWorkbenchStore,
  executeLfeaWorkbench,
  resealLfeaMeshPackage,
} from '../src/workspace/lfea-workbench.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtures = [rectangularQ4Package({}), t3PlatePackage({}), sparseRoundTripPackage()];

for (const packageValue of fixtures) {
  const first = executeLfeaWorkbench(packageValue, {});
  const second = executeLfeaWorkbench(packageValue, {});
  assert.equal(first.status, 'QUALIFIED', `${packageValue.packageIdentity} [SIMULATED] fixture must qualify.`);
  assert.equal(first.result.status, 'QUALIFIED');
  assert.equal(first.review.status, 'QUALIFIED_FOR_REVIEW');
  assert.equal(first.evidenceExport.status, 'QUALIFIED_EXPORT');
  assert.equal(first.authorityPolicy.rawStress, 'AUTHORITATIVE_RAW_ELEMENT_OR_INTEGRATION_POINT_STRESS');
  assert.equal(first.authorityPolicy.projectedStress, 'NON_AUTHORITATIVE_REVIEW_PROJECTION');
  assert.equal(first.authorityPolicy.projectedStressForConvergence, 'PROHIBITED');
  assert.equal(first.result.semanticHash, second.result.semanticHash);
  assert.equal(first.review.semanticHash, second.review.semanticHash);
  assert.equal(first.evidenceExport.semanticHash, second.evidenceExport.semanticHash);
}

const packageValue = rectangularQ4Package({});
const store = createLfeaWorkbenchStore({ initialDocument: packageValue });
const originalHash = store.getState().packageValue.semanticHash;
store.moveNode('N2', 2.25, 0);
const editedHash = store.getState().packageValue.semanticHash;
assert.notEqual(editedHash, originalHash);
assert.equal(store.getState().execution, null);
store.undo();
assert.equal(store.getState().packageValue.semanticHash, originalHash);
store.redo();
assert.equal(store.getState().packageValue.semanticHash, editedHash);
assert.equal(store.run().status, 'QUALIFIED');
assert.equal(store.exportDocument().schema, 'lfea-workbench-document/v1');
assert.equal(store.exportEvidence().status, 'QUALIFIED_EXPORT');

const forged = structuredClone(packageValue);
forged.nodes[0].x += 0.01;
const importStore = createLfeaWorkbenchStore(undefined);
importStore.importDocument(forged);
assert.equal(importStore.getState().status, 'FAILED');
assert.equal(importStore.getState().packageValue, null);

const singularDraft = structuredClone(packageValue);
singularDraft.analysisDefinition.constraints = [];
const singular = executeLfeaWorkbench(resealLfeaMeshPackage(singularDraft), {});
assert.equal(singular.status, 'FAILED');
assert.equal(singular.failedStage, 'SOLVER');
assert.equal(singular.result.status, 'REJECTED_SINGULAR');
assert.equal(singular.review, null);
assert.equal(singular.evidenceExport, null);

const workbenchFiles = fs.readdirSync(path.join(ROOT, 'src', 'workspace'))
  .filter((name) => name.startsWith('lfea-workbench') && name.endsWith('.js'));
const sourceText = workbenchFiles.map((name) => fs.readFileSync(path.join(ROOT, 'src', 'workspace', name), 'utf8')).join('\n');
assert.doesNotMatch(sourceText, /EventBus|analysis-context|workspace-consumer-context/u);

const panelsSource = fs.readFileSync(
  path.join(ROOT, 'src', 'workspace', 'lfea-workbench-panels.js'),
  'utf8',
);
const stylesSource = fs.readFileSync(
  path.join(ROOT, 'src', 'workspace', 'lfea-workbench-styles.js'),
  'utf8',
);

for (const status of ['EMPTY', 'READY', 'RUNNING', 'QUALIFIED', 'FAILED']) {
  assert.match(
    stylesSource,
    new RegExp(`lfea-workbench__status\\[data-status="${status}"\\]`, 'u'),
    `workbench status styling must explicitly distinguish ${status}`,
  );
}
assert.match(
  panelsSource,
  /Displayed displacement multiplier[\s\S]*?dimensionless; 1× = true displacement; displacement unit \$\{displacementUnit\}/u,
  'deformation control must identify the scale as dimensionless and keep its result unit separate',
);
assert.match(
  panelsSource,
  /state\.packageValue\?\.analysisDefinition\?\.solverProfile\?\.units\?\.length/u,
  'deformation presentation must source the displacement unit from the committed solver profile',
);
assert.match(panelsSource, /input\.dataset\.quantity = 'DIMENSIONLESS_DISPLAY_MULTIPLIER'/u);
assert.match(
  panelsSource,
  /input\.title = `Display-only multiplier\. Calculated displacement values remain in \$\{displacementUnit\}\.`/u,
  'deformation title must preserve display-only authority',
);

const progressLabels = {
  QUEUED: 'Queued for analysis',
  VALIDATE: 'Validating mesh package',
  PREFLIGHT: 'Checking declared capacity',
  ADAPT: 'Building qualified FEA model',
  SOLVE: 'Solving continuum model',
  PROJECT: 'Preparing review stress projection',
  REVIEW: 'Running engineering review',
  EXPORT: 'Preparing evidence export',
  COMPLETE: 'Analysis complete',
};
for (const [stage, label] of Object.entries(progressLabels)) {
  assert.match(
    panelsSource,
    new RegExp(`${stage}: '${label}'`, 'u'),
    `progress presentation must map real stage ${stage}`,
  );
}
assert.match(
  panelsSource,
  /progressStageLabel\(rawStage\)[\s\S]*?output\.dataset\.stage = rawStage;[\s\S]*?output\.title = `Pipeline stage: \$\{rawStage\}`/u,
  'progress output must retain raw stage metadata/title beside the human label',
);
assert.match(
  panelsSource,
  /return PROGRESS_STAGE_LABELS\[stage\] \?\? stage/u,
  'unknown future progress stages must remain visible as their raw code',
);

assert.doesNotMatch(
  panelsSource,
  /Mesh quality evidence — no acceptance threshold applied/u,
  'quality results must not imply that no upstream geometry qualification exists',
);
assert.match(
  panelsSource,
  /meshQualityAuthority\(root, state\.packageValue\)[\s\S]*?lfeaResultTable\([\s\S]*?'Mesh quality evidence'/u,
  'quality table must be paired with explicit gate-ownership presentation',
);
assert.match(
  panelsSource,
  /solverProfile\?\.tolerances\?\.geometryArea/u,
  'quality authority note must source the declared upstream geometry tolerance',
);
assert.match(panelsSource, /value\.dataset\.role = 'lfea-quality-authority'/u);
assert.match(panelsSource, /value\.dataset\.geometryTolerance = toleranceText/u);
assert.match(
  panelsSource,
  /Geometry validity was qualified upstream using solverProfile\.tolerances\.geometryArea = \$\{toleranceText\}/u,
  'quality note must state upstream geometry qualification',
);
assert.match(
  panelsSource,
  /This panel adds no separate acceptance threshold to the displayed Jacobian ratio, edge-length ratio, or corner-cosine metrics/u,
  'quality note must distinguish descriptive metrics from upstream geometry validity gates',
);
assert.match(
  panelsSource,
  /signed-area\/Jacobian validity remains governed by upstream model qualification/u,
  'quality note must preserve signed-area/Jacobian gate ownership',
);

console.log(JSON.stringify({
  check: 'lfea-workbench',
  evidenceBasis: '[SIMULATED]/ANALYTICAL',
  status: 'PASS',
  qualifiedFixtures: fixtures.map((row) => row.packageIdentity),
  rawStressAuthority: 'AUTHORITATIVE_RAW_ELEMENT_OR_INTEGRATION_POINT_STRESS',
  projectedStressAuthority: 'NON_AUTHORITATIVE_REVIEW_PROJECTION',
  failClosed: true,
  workspaceCoupling: false,
  statusStatePresentationGuarded: true,
  deformationMultiplierSemanticsGuarded: true,
  progressStageHumanLabelsGuarded: true,
  qualityGateOwnershipGuarded: true,
}));
