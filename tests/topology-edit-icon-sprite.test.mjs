import assert from 'node:assert/strict';
import {
  topologyEditRequiredIconEntries,
} from '../src/workspace/viewport-productivity/topology-edit-icon-manifest.js';
import {
  TOPOLOGY_EDIT_ICON_SYMBOLS,
  topologyEditIconSpriteMarkup,
} from '../src/workspace/viewport-productivity/topology-edit-icon-sprite.js';

const requiredSymbolIds = [...new Set(
  topologyEditRequiredIconEntries().map((entry) => entry.symbolId),
)].sort();
const spriteSymbolIds = TOPOLOGY_EDIT_ICON_SYMBOLS.map((entry) => entry.id).sort();

assert.equal(requiredSymbolIds.length, 41, 'Locked 42-control manifest must resolve to 41 production symbols.');
assert.equal(new Set(spriteSymbolIds).size, spriteSymbolIds.length, 'Production symbol IDs must be unique.');
assert.deepEqual(spriteSymbolIds, requiredSymbolIds, 'Sprite inventory must exactly match manifest-required symbol IDs.');

for (const symbol of TOPOLOGY_EDIT_ICON_SYMBOLS) {
  assert.match(symbol.id, /^icon-[a-z0-9-]+$/);
  assert.ok(!symbol.id.endsWith('-broken'), `Production symbol ${symbol.id} cannot end in -broken.`);
  assert.equal(symbol.viewBox, '0 0 16 16', `Unexpected viewBox drift for ${symbol.id}.`);
  assert.match(
    symbol.geometry,
    /<(?:path|rect|circle|ellipse|line|polyline|polygon)\b/,
    `Production symbol ${symbol.id} must contain drawable SVG geometry.`,
  );
}

const spriteMarkup = topologyEditIconSpriteMarkup();
for (const symbolId of requiredSymbolIds) {
  assert.ok(
    spriteMarkup.includes(`<symbol id="${symbolId}" `),
    `Production sprite markup must contain exactly declared symbol ${symbolId}.`,
  );
}

console.log(`topology-edit-icon-sprite: ${spriteSymbolIds.length}/41 deterministic production symbols.`);
