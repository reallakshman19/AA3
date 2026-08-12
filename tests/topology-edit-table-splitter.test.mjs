import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clampTopologyEditTableDetailHeight,
  topologyEditTableDetailHeightForKey,
  topologyEditTableDetailHeightForPointerDrag,
  topologyEditTableSplitterBounds,
} from '../src/workspace/viewport-productivity/topology-edit-table-splitter-runtime.js';

test('Engineering Table splitter derives deterministic usable bounds', () => {
  const bounds = topologyEditTableSplitterBounds({
    containerHeightPx: 720,
    headerHeightPx: 36,
  });
  assert.deepEqual(bounds, { min: 96, max: 556 });
  assert.equal(clampTopologyEditTableDetailHeight(undefined, bounds), 210);
  assert.equal(clampTopologyEditTableDetailHeight(40, bounds), 96);
  assert.equal(clampTopologyEditTableDetailHeight(900, bounds), 556);
});

test('Engineering Table splitter clamps detail pane when the outer window is short', () => {
  const bounds = topologyEditTableSplitterBounds({
    containerHeightPx: 180,
    headerHeightPx: 36,
  });
  assert.deepEqual(bounds, { min: 96, max: 96 });
  assert.equal(clampTopologyEditTableDetailHeight(210, bounds), 96);
});

test('dragging separator upward grows details and downward grows row-list space', () => {
  const bounds = { min: 96, max: 556 };
  assert.equal(topologyEditTableDetailHeightForPointerDrag({
    startHeightPx: 210,
    startClientY: 300,
    clientY: 250,
    bounds,
  }), 260);
  assert.equal(topologyEditTableDetailHeightForPointerDrag({
    startHeightPx: 210,
    startClientY: 300,
    clientY: 360,
    bounds,
  }), 150);
});

test('keyboard separator controls are bounded and deterministic', () => {
  const bounds = { min: 96, max: 556 };
  assert.equal(topologyEditTableDetailHeightForKey(210, 'ArrowUp', bounds), 234);
  assert.equal(topologyEditTableDetailHeightForKey(210, 'ArrowDown', bounds), 186);
  assert.equal(topologyEditTableDetailHeightForKey(210, 'Home', bounds), 96);
  assert.equal(topologyEditTableDetailHeightForKey(210, 'End', bounds), 556);
  assert.equal(topologyEditTableDetailHeightForKey(210, 'Enter', bounds), null);
  assert.equal(topologyEditTableDetailHeightForKey(100, 'ArrowDown', bounds), 96);
  assert.equal(topologyEditTableDetailHeightForKey(550, 'ArrowUp', bounds), 556);
});
