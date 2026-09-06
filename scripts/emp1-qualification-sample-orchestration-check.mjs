import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const controllerPath = 'src/workspace/lafea-workbench-controller.js';
const samplePath = 'src/workspace/emp1-workbench-qualification-sample.js';
const controllerSource = await readFile(controllerPath, 'utf8');
const sampleSource = await readFile(samplePath, 'utf8');

const methodStart = controllerSource.indexOf('  async loadEmp1QualificationSample() {');
const methodEnd = controllerSource.indexOf('\n  exportDocument()', methodStart);
assert.notEqual(methodStart, -1, 'EMP1_QUALIFICATION_SAMPLE_LOADER_REQUIRED');
assert.notEqual(methodEnd, -1, 'EMP1_QUALIFICATION_SAMPLE_LOADER_BOUNDARY_REQUIRED');
const method = controllerSource.slice(methodStart, methodEnd);

const orderedMarkers = [
  "this.importDocument(sample.aDocument, 'LAFEA.1')",
  "this.store.selectStage('LAFEA.1')",
  'const ranA = this.run()',
  "aExecution?.status !== 'QUALIFIED'",
  "aExecution?.result?.qualification?.state !== 'ACCEPTED'",
  "this.importDocument(sample.bDocument, 'LAFEA.2')",
  'this.setEmp1RunInput(sample.runInput)',
  "this.store.selectStage('LAFEA.2')",
  'await this.runEmp1Product()',
];

let previous = -1;
for (const marker of orderedMarkers) {
  const index = method.indexOf(marker);
  assert.ok(index > previous, `EMP1_QUALIFICATION_SAMPLE_SEQUENCE_REQUIRED:${marker}`);
  previous = index;
}

assert.match(method, /error\.code = 'EMP1_A_CURRENT_QUALIFIED_RESULT_REQUIRED'/u);
assert.equal(method.includes('sample.aExecution'), false,
  'EMP1_QUALIFICATION_SAMPLE_MUST_NOT_INJECT_FACTORY_A_EXECUTION');

const factoryStart = sampleSource.indexOf('export function createEmp1WorkbenchQualificationSample()');
const returnStart = sampleSource.indexOf('return deepFreeze({', factoryStart);
const returnEnd = sampleSource.indexOf('\n  });', returnStart);
assert.ok(factoryStart >= 0 && returnStart > factoryStart && returnEnd > returnStart,
  'EMP1_QUALIFICATION_SAMPLE_FACTORY_RETURN_REQUIRED');
const factoryReturn = sampleSource.slice(returnStart, returnEnd);
assert.match(factoryReturn, /\baDocument\b/u);
assert.match(factoryReturn, /\bbDocument\b/u);
assert.match(factoryReturn, /\brunInput\b/u);
assert.equal(/\baExecution\b/u.test(factoryReturn), false,
  'EMP1_QUALIFICATION_SAMPLE_FACTORY_MUST_NOT_EXPORT_A_EXECUTION');

console.log(JSON.stringify({
  schema: 'emp1-qualification-sample-orchestration-check/v1',
  status: 'PASS_STATIC_QUALIFICATION_SAMPLE_A_THEN_B_THEN_C_CONTRACT',
  aExecutionPath: 'NORMAL_CONTROLLER_STORE_RUN',
  aMustBeQualified: true,
  aQualificationMustBeAccepted: true,
  bImportedAfterAQualified: true,
  cRunAfterBAndRunInput: true,
  factoryExecutionInjectionAllowed: false,
}, null, 2));
