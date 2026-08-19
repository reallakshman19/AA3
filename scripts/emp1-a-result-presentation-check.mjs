import assert from 'node:assert/strict';
import { createLafeaMockDocument } from '../src/workspace/lafea-simulated-source-provider.js';
import { executeLafeaStage } from '../src/workspace/lafea-workbench-model.js';
import {
  presentLafeaResult,
  resolveLafeaUnits,
} from '../src/workspace/lafea-result-presenters/index.js';

const stageId = 'LAFEA.1';
const documentValue = await createLafeaMockDocument(stageId);
const execution = executeLafeaStage(stageId, documentValue);

assert.equal(execution.status, 'QUALIFIED');
assert.ok(execution.result);
assert.equal(execution.result.schema, 'local-attachment-foundation-result/v1');

const units = resolveLafeaUnits(stageId, documentValue);
const presentation = presentLafeaResult(stageId, execution.result, units);

assert.ok(Array.isArray(presentation.sections));
assert.ok(presentation.sections.length >= 2);
assert.ok(presentation.sections.some((section) => section.title === 'Transferred resultants'));
assert.ok(presentation.sections.some((section) => section.title === 'Lamé pressure stress'));

console.log(JSON.stringify({
  schema: 'emp1-a-result-presentation-check/v1',
  status: 'PASS',
  resultSchema: execution.result.schema,
  units,
  sectionTitles: presentation.sections.map((section) => section.title),
  rowCounts: Object.fromEntries(presentation.sections.map((section) => [section.title, section.rows.length])),
}, null, 2));
