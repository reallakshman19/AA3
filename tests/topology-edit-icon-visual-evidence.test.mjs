import assert from 'node:assert/strict';
import test from 'node:test';
import {
  certifyClip,
  computeIconEvidence,
  evaluateGeometry,
  evaluatePresentationChain,
  paintHasVisibleAlpha,
} from '../e2e/helpers/topology-edit-icon-visual-evidence.js';

const visibleRecord = (overrides = {}) => ({
  tag: 'use',
  display: 'inline',
  visibility: 'visible',
  contentVisibility: 'visible',
  opacity: '1',
  clipPath: 'none',
  clip: 'auto',
  boundsWidth: 16,
  boundsHeight: 16,
  ...overrides,
});

const paintedGeometry = (overrides = {}) => ({
  tag: 'path',
  fill: 'rgb(15, 23, 42)',
  fillOpacity: '1',
  stroke: 'none',
  strokeOpacity: '1',
  strokeWidth: '0',
  usesCurrentColor: false,
  bounds: { x: 0, y: 0, width: 12, height: 12 },
  length: 0,
  chain: [visibleRecord({ tag: 'path' })],
  ...overrides,
});

test('paint alpha rejects none/transparent and near-zero alpha, accepts opaque paint', () => {
  assert.equal(paintHasVisibleAlpha('none'), false);
  assert.equal(paintHasVisibleAlpha('transparent'), false);
  assert.equal(paintHasVisibleAlpha(''), false);
  assert.equal(paintHasVisibleAlpha('rgba(0, 0, 0, 0.005)'), false);
  assert.equal(paintHasVisibleAlpha('rgb(0 0 0 / 0.4%)'), false);
  assert.equal(paintHasVisibleAlpha('rgba(0, 0, 0, 0.9)'), true);
  assert.equal(paintHasVisibleAlpha('rgb(15, 23, 42)'), true);
});

test('clip certification proves inset/circle/ellipse and fails closed on unknown forms', () => {
  assert.equal(certifyClip(visibleRecord()).kind, 'NONE');
  assert.equal(certifyClip(visibleRecord({ clip: 'rect(0px, 0px, 0px, 0px)' })).fullyClipped, true);

  const halfInset = certifyClip(visibleRecord({ clipPath: 'inset(25%)' }));
  assert.equal(halfInset.kind, 'INSET');
  assert.equal(halfInset.fullyClipped, false);
  assert.equal(certifyClip(visibleRecord({ clipPath: 'inset(50%)' })).fullyClipped, true);

  assert.equal(certifyClip(visibleRecord({ clipPath: 'circle(0px)' })).fullyClipped, true);
  assert.equal(certifyClip(visibleRecord({ clipPath: 'circle(4px)' })).fullyClipped, false);
  assert.equal(certifyClip(visibleRecord({ clipPath: 'ellipse(0px 4px)' })).fullyClipped, true);

  for (const clipPath of ['polygon(0 0, 100% 0, 100% 100%)', 'url(#mask)', 'path("M0 0h4")']) {
    const verdict = certifyClip(visibleRecord({ clipPath }));
    assert.equal(verdict.certifiable, false, `${clipPath} must not certify visible paint`);
    assert.equal(verdict.kind, 'UNPROVEN');
  }
});

test('presentation chain fails closed on hidden ancestors and near-zero cumulative opacity', () => {
  assert.equal(evaluatePresentationChain([visibleRecord()]).visible, true);
  assert.equal(evaluatePresentationChain([]).visible, false);

  const selfHidden = evaluatePresentationChain([visibleRecord({ display: 'none' })]);
  assert.equal(selfHidden.visible, false);
  assert.equal(selfHidden.hiddenBy, 'self');

  const ancestorHidden = evaluatePresentationChain([
    visibleRecord(),
    visibleRecord({ tag: 'div', visibility: 'hidden' }),
  ]);
  assert.equal(ancestorHidden.visible, false);
  assert.equal(ancestorHidden.hiddenBy, 'div');

  const compounded = evaluatePresentationChain([
    visibleRecord({ opacity: '0.1' }),
    visibleRecord({ tag: 'span', opacity: '0.05' }),
  ]);
  assert.equal(compounded.visible, false, 'cumulative opacity 0.005 is not visible paint');
});

test('geometry evidence counts only painted, extended, visible nodes', () => {
  assert.equal(evaluateGeometry([paintedGeometry()], 'rgb(0,0,0)').drawableGeometryCount, 1);
  assert.equal(
    evaluateGeometry([paintedGeometry({ fill: 'none' })], 'rgb(0,0,0)').drawableGeometryCount,
    0,
  );
  assert.equal(
    evaluateGeometry([paintedGeometry({
      bounds: { x: 0, y: 0, width: 0, height: 0 },
    })], 'rgb(0,0,0)').drawableGeometryCount,
    0,
    'empty geometry is never drawable',
  );

  const strokeOnly = paintedGeometry({ fill: 'none', stroke: 'rgb(1,2,3)', strokeWidth: '2' });
  const strokeEvidence = evaluateGeometry([strokeOnly], 'rgb(0,0,0)');
  assert.equal(strokeEvidence.drawableGeometryCount, 1, 'stroke-only icons are valid');
  assert.equal(strokeEvidence.maxStrokeWidth, 2);

  const currentColor = paintedGeometry({ fill: 'currentcolor', usesCurrentColor: true });
  assert.equal(evaluateGeometry([currentColor], 'transparent').drawableGeometryCount, 0);
  assert.equal(evaluateGeometry([currentColor], 'rgb(9,9,9)').drawableGeometryCount, 1);
});

const rawIcon = (overrides = {}) => ({
  hasUse: true,
  actualReference: '#icon-undo',
  resolvedTargetId: 'icon-undo',
  targetCount: 1,
  useColor: 'rgb(15, 23, 42)',
  useChain: [visibleRecord()],
  rawGeometry: [paintedGeometry()],
  renderedBounds: { width: 16, height: 16, top: 10, left: 10 },
  useBounds: { x: 0, y: 0, width: 12, height: 12 },
  viewBox: { x: 0, y: 0, width: 24, height: 24 },
  viewportWidth: 1600,
  viewportHeight: 1100,
  state: { disabled: false, pressed: null, expanded: null },
  bindingKey: 'history.undo',
  bindingSymbol: 'icon-undo',
  bindingIdentity: { action: 'undo' },
  expectedKey: 'history.undo',
  ...overrides,
});

test('icon evidence reaches VISUALLY_RENDERED only with resolved, painted, on-screen geometry', () => {
  assert.equal(computeIconEvidence(rawIcon()).referenceStatus, 'VISUALLY_RENDERED');

  assert.equal(computeIconEvidence(rawIcon({ hasUse: false })).referenceStatus, 'NO_SVG_ICONS');
  assert.equal(
    computeIconEvidence(rawIcon({ actualReference: '#icon-undo-broken' })).referenceStatus,
    'BROKEN',
  );
  assert.equal(computeIconEvidence(rawIcon({ targetCount: 0 })).referenceStatus, 'UNRESOLVED');
  assert.equal(computeIconEvidence(rawIcon({ targetCount: 2 })).referenceStatus, 'UNRESOLVED');

  // Resolvable but not visibly painted must stay RESOLVED, never VISUALLY_RENDERED.
  const hidden = computeIconEvidence(rawIcon({ useChain: [visibleRecord({ display: 'none' })] }));
  assert.equal(hidden.referenceStatus, 'RESOLVED');
  assert.equal(hidden.computedVisibility.visible, false);

  const empty = computeIconEvidence(rawIcon({ rawGeometry: [] }));
  assert.equal(empty.referenceStatus, 'RESOLVED');
  assert.equal(empty.drawableGeometryCount, 0);

  const offscreen = computeIconEvidence(rawIcon({
    renderedBounds: { width: 16, height: 16, top: 4000, left: 10 },
  }));
  assert.equal(offscreen.computedVisibility.inViewport, false);
  assert.equal(offscreen.referenceStatus, 'RESOLVED');

  const outsideViewBox = computeIconEvidence(rawIcon({
    useBounds: { x: 900, y: 900, width: 12, height: 12 },
  }));
  assert.equal(outsideViewBox.computedVisibility.intersectsViewBox, false);
  assert.equal(outsideViewBox.referenceStatus, 'RESOLVED');

  const zeroViewport = computeIconEvidence(rawIcon({
    viewBox: { x: 0, y: 0, width: 0, height: 0 },
  }));
  assert.equal(zeroViewport.computedVisibility.intersectsViewBox, false);
});

test('stroke padding widens paint bounds so hairline strokes still intersect the viewBox', () => {
  const evidence = computeIconEvidence(rawIcon({
    rawGeometry: [paintedGeometry({
      fill: 'none', stroke: 'rgb(1,2,3)', strokeWidth: '4', bounds: { x: 0, y: 0, width: 0, height: 8 },
    })],
    useBounds: { x: 0, y: 0, width: 0, height: 8 },
  }));
  assert.equal(evidence.paintBounds.width, 4);
  assert.equal(evidence.paintBounds.x, -2);
  assert.equal(evidence.computedVisibility.intersectsViewBox, true);
});
