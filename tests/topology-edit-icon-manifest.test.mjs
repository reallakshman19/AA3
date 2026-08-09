import assert from 'node:assert/strict';
import {
  TOPOLOGY_EDIT_ICON_DISPOSITION,
  TOPOLOGY_EDIT_ICON_MANIFEST,
  topologyEditRequiredIconEntries,
} from '../src/workspace/viewport-productivity/topology-edit-icon-manifest.js';

const EXPECTED_CONTROL_COUNT = 42;
const HISTORICAL_EXACT = Object.freeze({
  'navigation.orbit': 'icon-orbit',
  'navigation.pan': 'icon-pan',
  'history.undo': 'icon-undo',
  'history.redo': 'icon-redo',
  'draft.save': 'icon-save',
  'command.move-positive-z': 'icon-move',
});

assert.equal(
  TOPOLOGY_EDIT_ICON_MANIFEST.length,
  EXPECTED_CONTROL_COUNT,
  'Every fixed production 3D Edit control must have exactly one manifest disposition.',
);

assert.equal(
  new Set(TOPOLOGY_EDIT_ICON_MANIFEST.map((entry) => entry.key)).size,
  EXPECTED_CONTROL_COUNT,
  'Manifest control keys must be unique.',
);
assert.equal(
  new Set(TOPOLOGY_EDIT_ICON_MANIFEST.map((entry) => entry.selector)).size,
  EXPECTED_CONTROL_COUNT,
  'Manifest control selectors must be unique.',
);

for (const entry of TOPOLOGY_EDIT_ICON_MANIFEST) {
  assert.ok(entry.key && entry.selector && entry.label && entry.surface, `Incomplete manifest row ${entry.key}.`);
  assert.ok(
    Object.values(TOPOLOGY_EDIT_ICON_DISPOSITION).includes(entry.disposition),
    `Unsupported icon disposition for ${entry.key}.`,
  );
  assert.equal(entry.accessibility.accessibleName, entry.label, `Accessible name drift for ${entry.key}.`);
  assert.equal(entry.accessibility.iconAriaHidden, true, `Decorative icon must be aria-hidden for ${entry.key}.`);
  assert.ok(entry.stateExpectations.length > 0, `State expectations are required for ${entry.key}.`);

  if (entry.disposition === TOPOLOGY_EDIT_ICON_DISPOSITION.SVG_ICON) {
    assert.match(entry.symbolId, /^icon-[a-z0-9-]+$/, `Invalid production symbol id for ${entry.key}.`);
    assert.ok(!entry.symbolId.endsWith('-broken'), `Production symbol id cannot end in -broken for ${entry.key}.`);
  } else {
    assert.equal(entry.symbolId, null, `Text-only control ${entry.key} cannot declare an SVG symbol.`);
  }
}

assert.equal(
  topologyEditRequiredIconEntries().length,
  EXPECTED_CONTROL_COUNT,
  'The locked #976 production design requires SVG icons on all 42 fixed controls.',
);

for (const [key, expectedFragmentId] of Object.entries(HISTORICAL_EXACT)) {
  const entry = TOPOLOGY_EDIT_ICON_MANIFEST.find((candidate) => candidate.key === key);
  assert.ok(entry, `Historical control ${key} must remain in the production manifest.`);
  assert.equal(entry.historicalFragmentId, expectedFragmentId, `Historical fragment provenance drift for ${key}.`);
  assert.equal(entry.symbolId, expectedFragmentId, `Preserved historical fragment must remain the current symbol for ${key}.`);
}

const fit = TOPOLOGY_EDIT_ICON_MANIFEST.find((entry) => entry.key === 'navigation.fit');
assert.equal(fit?.symbolId, 'icon-fit');
assert.equal(
  fit?.historicalFragmentId,
  null,
  'Fit was historically affected but its historical href was not retained; do not fabricate provenance.',
);

console.log(`topology-edit-icon-manifest: ${EXPECTED_CONTROL_COUNT}/42 controls dispositioned; ${topologyEditRequiredIconEntries().length} required SVG icons.`);
