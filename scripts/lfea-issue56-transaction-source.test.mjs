/** Source-coupled tests: production transaction modules + synthetic owner/authority. */
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const base = new URL('../src/', import.meta.url);
const context = vm.createContext({ structuredClone });
const modules = new Map();
let sharedBasis = Object.freeze({ editionProfileId: null, smooth90FlexibilityCorrection: null, complete: false });
function mod(key, source) {
  const m = new vm.SourceTextModule(source, { context, identifier: key });
  modules.set(key, m);
  return m;
}
mod('authority', `
  export const lfeaBendFactorAuthoritySelection = () => globalThis.testGetBasis();
  export function normalizeLfeaComponentBasisSelection(v) { return Object.freeze({ ...v, complete: Boolean(v.editionProfileId && v.smooth90FlexibilityCorrection !== null) }); }
  export function commitLfeaComponentBasisSelection(v, options) {
    if (JSON.stringify(globalThis.testGetBasis()) !== JSON.stringify(options.expectedSelection)) throw new TypeError('Conflicting basis.');
    globalThis.testSetBasis(v); options.onAdopt();
  }
`);
context.testGetBasis = () => sharedBasis;
context.testSetBasis = (v) => { sharedBasis = v; };
mod('profile', `export const LFEA_PIPELINE_ACCDB_PROFILE_IDS = ['PROFILE'];`);
mod('source-binding', `export const ACCDB_ELEMENT_FIELD_SPECS = [{ name: 'DIAMETER', kind: 'NUMBER' }, { name: 'WALL_THICK', kind: 'NUMBER' }];`);
const overrideSource = readFileSync(new URL('core/linear-piping-analysis-consumer/accdb-field-overrides.js', base), 'utf8');
const batchSource = readFileSync(new URL('workspace/lfea-accdb-workbench-batch.js', base), 'utf8');
const overrides = mod('overrides', overrideSource);
const batch = mod('batch', batchSource);
function resolve(from, spec) {
  if (from === 'overrides') return modules.get('source-binding');
  if (spec.endsWith('lfea-bend-factor-authority-control.js')) return modules.get('authority');
  if (spec.endsWith('lfea-pipeline-accdb-view-model.js')) return modules.get('profile');
  if (spec.endsWith('accdb-field-overrides.js')) return overrides;
  throw new TypeError(`Unmapped import ${spec}`);
}
await batch.link((spec, parent) => resolve(parent.identifier, spec));
await batch.evaluate();
const { AccdbWorkbenchMethods } = batch.namespace;
const { applyAccdbFieldOverrides } = overrides.namespace;

function owner() {
  const x = new AccdbWorkbenchMethods();
  x.tables = { INPUT_BASIC_ELEMENT_DATA: { rows: [{ ELEMENTID: 1, DIAMETER: 100, WALL_THICK: 8 }] } };
  x.effectiveTables = x.tables;
  x.sourceBaseIdentity = 'SOURCE'; x.originalAccdbByteSha256 = 'FIXTURE';
  x.coordinateRevision = 0; x.coordinateEdits = []; x.coordinateCursor = 0;
  x.requestedProfileId = 'PROFILE'; x.requestedCaseIds = ['CASE-A'];
  x.preFlight = { semanticHash: 'BEFORE', status: 'BLOCK' };
  x.sourceBundle = { unitSystem: { declared: { length: 'mm' } } };
  x.overrideSet = null; x.overrideDisclosures = []; x.overrideApprover = 'ORIGINAL'; x.overrideReason = 'ORIGINAL_REASON';
  x.render = () => {}; x.notifyStateChanged = () => { x.notifyCount++; }; x.notifyCount = 0;
  x.getSnapshot = () => ({});
  x.withCoordinateEdits = (tables) => ({ tables, disclosures: [] });
  x.prepareCandidate = (tables, settings) => ({ effectiveTables: tables,
    preFlight: { semanticHash: 'AFTER', status: 'CONDITIONAL' },
    requestedCaseIds: settings.requestedCaseIds, requestedProfileId: settings.requestedProfileId,
    componentBasis: settings.componentBasis });
  x.adoptCandidate = (candidate) => { x.effectiveTables = candidate.effectiveTables; x.preFlight = candidate.preFlight; };
  return x;
}
function req(x, patches=[], basis=undefined, approval={}) {
  return { ...x.getWorkbenchSnapshot(), propertyPatches: patches, ...approval,
    ...(basis === undefined ? {} : { componentBasis: basis }) };
}

test('settings-only basis preparation needs no invented reviewer', () => {
  sharedBasis = { editionProfileId: null, smooth90FlexibilityCorrection: null, complete: false };
  const x = owner();
  const next = { editionProfileId: 'B31_3_2024_B31J_2023', smooth90FlexibilityCorrection: false };
  const p = x.previewWorkbenchBatch(req(x, [], next));
  assert.equal(p.changed, true); assert.equal(x.notifyCount, 0);
  x.applyWorkbenchBatch(p.token);
  assert.equal(x.notifyCount, 1);
  assert.equal(x.overrideApprover, 'ORIGINAL');
  assert.equal(x.overrideReason, 'ORIGINAL_REASON');
});

test('source edits still require actual reviewer identity and reason', () => {
  sharedBasis = { editionProfileId: null, smooth90FlexibilityCorrection: null, complete: false };
  const x = owner();
  assert.throws(() => x.previewWorkbenchBatch(req(x,
    [{ accdbElementId: '1', field: 'DIAMETER', rawValue: 120 }])), /approver|reason/i);
  assert.equal(x.notifyCount, 0);
});

test('cancelled actual transaction token fails closed with no adoption', () => {
  const x = owner();
  const before = x.preFlight;
  const p = x.previewWorkbenchBatch(req(x,
    [{ accdbElementId: '1', field: 'DIAMETER', rawValue: 120 }], undefined,
    { approver: 'Engineer', reason: 'Approved correction' }));
  x.cancelWorkbenchBatch(p.token);
  assert.throws(() => x.applyWorkbenchBatch(p.token), /stale|used|unknown/i);
  assert.equal(x.preFlight, before);
  assert.equal(x.notifyCount, 0);
});

test('previous override retains actor and reason under settings-only transaction', () => {
  sharedBasis = { editionProfileId: null, smooth90FlexibilityCorrection: null, complete: false };
  const x = owner();
  const previous = applyAccdbFieldOverrides(x.tables, { approver: 'Original Author', reason: 'Original basis',
    overrides: [{ accdbElementId: '1', field: 'DIAMETER', rawValue: 110 }] });
  x.overrideSet = previous.overrideSet; x.overrideDisclosures = previous.disclosures;
  x.effectiveTables = previous.tables;
  const p = x.previewWorkbenchBatch(req(x, [], { editionProfileId: 'B31_3_2024_B31J_2023', smooth90FlexibilityCorrection: false }));
  x.applyWorkbenchBatch(p.token);
  assert.equal(x.overrideDisclosures[0].data.approver, 'Original Author');
  assert.equal(x.overrideDisclosures[0].data.reason, 'Original basis');
  assert.equal(x.overrideApprover, 'ORIGINAL');
});
