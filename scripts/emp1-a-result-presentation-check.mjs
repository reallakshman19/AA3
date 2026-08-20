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
const pressureSection = presentation.sections.find((section) => section.title === 'Lamé pressure stress');
assert.ok(pressureSection);

const axialAudit = [];
for (const [index, record] of execution.result.pressureStressResults.entries()) {
  const prefix = `result.pressureStressResults[${index}]`;
  const stressRows = pressureSection.rows.filter((row) => row.sourcePath === `${prefix}.axialPressureStress`);
  const resultantRows = pressureSection.rows.filter((row) => row.sourcePath === `${prefix}.explicitAxialResultant`);

  if (typeof record.axialPressureStress === 'number') {
    assert.equal(stressRows.length, 1);
    assert.equal(stressRows[0].value, record.axialPressureStress);
    assert.equal(stressRows[0].unit, units.stress);
  } else {
    assert.equal(record.axialPressureStress, null);
    assert.equal(stressRows.length, 0, 'Null axial pressure stress must not be converted into a presenter scalar.');
  }

  if (typeof record.explicitAxialResultant === 'number') {
    assert.equal(resultantRows.length, 1);
    assert.equal(resultantRows[0].value, record.explicitAxialResultant);
    assert.equal(resultantRows[0].unit, units.force);
  } else {
    assert.equal(record.explicitAxialResultant, null);
    assert.equal(resultantRows.length, 0);
  }

  assert.equal(
    typeof record.axialPressureStress === 'number' && typeof record.explicitAxialResultant === 'number',
    false,
    'Axial pressure stress and explicit axial resultant must remain mutually exclusive.',
  );

  axialAudit.push({
    identity: record.identity,
    axialPressureStress: record.axialPressureStress,
    explicitAxialResultant: record.explicitAxialResultant,
    renderedStressRows: stressRows.length,
    renderedResultantRows: resultantRows.length,
  });
}

assert.ok(
  axialAudit.some((row) => row.axialPressureStress === null),
  'Qualification fixture must exercise at least one nullable axial-pressure-stress result.',
);

console.log(JSON.stringify({
  schema: 'emp1-a-result-presentation-check/v1',
  status: 'PASS',
  resultSchema: execution.result.schema,
  units,
  sectionTitles: presentation.sections.map((section) => section.title),
  rowCounts: Object.fromEntries(presentation.sections.map((section) => [section.title, section.rows.length])),
  axialAudit,
  nullAxialStressInventedAsZero: false,
}, null, 2));
