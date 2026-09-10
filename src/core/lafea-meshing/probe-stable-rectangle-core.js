/**
 * Shared builder for a "probe-stable" structured T3 rectangle mesh.
 *
 * Root cause this exists to fix: a direct, non-averaged, per-element-constant
 * point recovery (T3 stress, or shear stress on any element family at a fixed
 * physical point) on a generic uniform mesher lands at an unpredictable
 * fractional position within its containing element as the global target
 * size halves each refinement level -- sometimes near one edge, sometimes
 * near the opposite edge -- so the recovered value oscillates
 * non-monotonically with mesh refinement instead of converging.
 *
 * Fix: build the rectangular grid anchored at the probe coordinate itself, so
 * the probe always sits at the SAME fixed fractional position within its
 * containing cell at every refinement level, and strictly on one side of
 * that cell's diagonal (never on it). That makes the sampled point's
 * distance from its containing element's centroid shrink proportionally with
 * h at every level, restoring genuine (first-order, since the recovered
 * quantity is piecewise-constant per T3 element) monotonic h-convergence.
 *
 * Used by both b02a-probe-stable-rectangle-mesh.js and
 * b02b-probe-stable-rectangle-mesh.js, each supplying their own frozen,
 * case-specific policy (geometry, probe coordinate, frozen h levels).
 */
import { canonicalLafeaSha256 } from '../../workspace/lafea-canonical-sha256.js';

export function buildProbeStableRectangleMesh(policy, { targetElementLength, elementFamily }) {
  if (!['T3', 'T6', 'Q8'].includes(elementFamily)) fail(policy.errorPrefix, 'ELEMENT_FAMILY_INVALID');
  const h = requireFrozenLevel(policy, targetElementLength);
  const xLines = axisLines(policy, policy.geometry.xMinimum, policy.geometry.xMaximum, policy.probe.x, policy.cellFraction.fx, h);
  const yLines = axisLines(policy, policy.geometry.yMinimum, policy.geometry.yMaximum, policy.probe.y, policy.cellFraction.fy, h);
  const state = { nodes: new Map(), edgeMidpoints: new Map(), elements: [], elementFamily };
  for (let i = 0; i < xLines.length; i += 1) {
    for (let j = 0; j < yLines.length; j += 1) {
      addNode(state, nodeId(i, j), xLines[i], yLines[j]);
    }
  }
  for (let i = 0; i < xLines.length - 1; i += 1) {
    for (let j = 0; j < yLines.length - 1; j += 1) {
      const bl = nodeId(i, j); const br = nodeId(i + 1, j);
      const tr = nodeId(i + 1, j + 1); const tl = nodeId(i, j + 1);
      if (elementFamily === 'Q8') {
        addQ8(state, `E-C${i}-R${j}`, [bl, br, tr, tl]);
      } else {
        addTriangle(state, `E-C${i}-R${j}-A`, [bl, br, tr]);
        addTriangle(state, `E-C${i}-R${j}-B`, [bl, tr, tl]);
      }
    }
  }
  requireProbeUnambiguous(policy, state, xLines, yLines);
  const mesh = analysisMesh(policy, state, h);
  const lengths = characteristicLengths(mesh);
  const base = {
    mesh,
    nodeCount: mesh.nodes.length,
    elementCount: mesh.elements.length,
    estimatedDofs: mesh.nodes.length * 2,
    boundarySegmentCount: 2 * (xLines.length - 1) + 2 * (yLines.length - 1),
    characteristicLengthMin: Math.min(...lengths),
    characteristicLengthMedian: median(lengths),
    characteristicLengthMax: Math.max(...lengths),
    strategy: policy.strategy,
    strategyReason: 'FROZEN_PHYSICAL_PROBE_STABLE_RECTANGLE_POLICY',
    holeCount: 0,
    ordinal: policy.hLevels.indexOf(h) + 1,
    targetElementLength,
    elementFamily,
    policyId: policy.policyId,
    policyHash: canonicalLafeaSha256(policy),
  };
  return deepFreeze({
    ...base,
    semanticHash: canonicalLafeaSha256({ schema: 'lafea-probe-stable-rectangle-mesh-output/v1', output: base }),
  });
}

/**
 * Grid-line coordinates covering [domainMin, domainMax] such that the anchor
 * coordinate sits at exactly `fraction` of the way across the cell that
 * contains it, for any h. The outer (non-anchor) span on each side is
 * rescaled to divide evenly into whole cells close to h, rather than
 * stepping by h and clipping the remainder -- which can leave a thin sliver
 * cell right at the domain boundary.
 */
function axisLines(policy, domainMin, domainMax, anchor, fraction, h) {
  if (domainMax - domainMin <= h) {
    if (!(anchor > domainMin && anchor < domainMax)) fail(policy.errorPrefix, 'PROBE_NOT_STRICTLY_INTERIOR');
    return [clean(domainMin), clean(domainMax)];
  }
  let cellLow = anchor - fraction * h;
  let cellHigh = anchor + (1 - fraction) * h;
  if (cellLow <= domainMin || cellHigh >= domainMax) fail(policy.errorPrefix, 'ANCHOR_CELL_OUT_OF_DOMAIN');
  // If the remaining span on a side is smaller than half an h, absorb it
  // into the anchor cell by extending that boundary straight to the domain
  // edge, rather than producing a thin sliver cell there.
  if (cellLow - domainMin < 0.2 * h) cellLow = domainMin;
  if (domainMax - cellHigh < 0.2 * h) cellHigh = domainMax;
  const lower = [cellLow, ...outerLines(cellLow, domainMin, h)];
  const upper = [cellHigh, ...outerLines(cellHigh, domainMax, h)];
  // lower.reverse() ends at cellLow; upper starts at cellHigh -- these are
  // the anchor cell's two distinct boundaries, so both must be kept (no
  // slice/dedup here: an earlier version dropped cellHigh entirely, silently
  // merging the anchor cell with its neighbor into one oversized cell).
  const lines = [...lower.reverse(), ...upper];
  return lines.map(clean);
}

/** Lines subdividing the span from `from` out to domain edge `to` into whole cells close to h. */
function outerLines(from, to, h) {
  const span = Math.abs(to - from);
  if (span <= 0) return [];
  const direction = Math.sign(to - from);
  const count = Math.max(1, Math.round(span / h));
  const step = span / count;
  const lines = [];
  for (let i = 1; i <= count; i += 1) lines.push(from + direction * i * step);
  return lines;
}

function requireProbeUnambiguous(policy, state, xLines, yLines) {
  const { x, y } = policy.probe;
  const i = xLines.findIndex((v, idx) => idx < xLines.length - 1 && x > v && x < xLines[idx + 1]);
  const j = yLines.findIndex((v, idx) => idx < yLines.length - 1 && y > v && y < yLines[idx + 1]);
  if (i < 0 || j < 0) fail(policy.errorPrefix, 'PROBE_NOT_STRICTLY_INTERIOR');
  if (state.elementFamily === 'Q8') return; // whole cell is one element; no diagonal ambiguity
  const x0 = xLines[i]; const x1 = xLines[i + 1]; const y0 = yLines[j]; const y1 = yLines[j + 1];
  const fx = (x - x0) / (x1 - x0);
  const fy = (y - y0) / (y1 - y0);
  if (Math.abs(fx - fy) < 1e-9) fail(policy.errorPrefix, 'PROBE_ON_DIAGONAL');
}

function addTriangle(state, elementId, cornerIds) {
  const nodeIds = state.elementFamily === 'T3'
    ? cornerIds
    : [...cornerIds,
      midpointId(state, cornerIds[0], cornerIds[1]),
      midpointId(state, cornerIds[1], cornerIds[2]),
      midpointId(state, cornerIds[2], cornerIds[0])];
  state.elements.push(Object.freeze({ elementId, elementType: state.elementFamily, nodeIds: Object.freeze(nodeIds) }));
}
function addQ8(state, elementId, cornerIds) {
  const nodeIds = [...cornerIds,
    midpointId(state, cornerIds[0], cornerIds[1]),
    midpointId(state, cornerIds[1], cornerIds[2]),
    midpointId(state, cornerIds[2], cornerIds[3]),
    midpointId(state, cornerIds[3], cornerIds[0])];
  state.elements.push(Object.freeze({ elementId, elementType: 'Q8', nodeIds: Object.freeze(nodeIds) }));
}
function midpointId(state, firstId, secondId) {
  const key = firstId < secondId ? `${firstId}:${secondId}` : `${secondId}:${firstId}`;
  if (state.edgeMidpoints.has(key)) return state.edgeMidpoints.get(key);
  const first = state.nodes.get(firstId); const second = state.nodes.get(secondId);
  const id = `M-${key.replace(':', '--')}`;
  addNode(state, id, (first.x + second.x) / 2, (first.y + second.y) / 2);
  state.edgeMidpoints.set(key, id);
  return id;
}
function analysisMesh(policy, state, h) {
  return deepFreeze({
    schema: 'lafea-analysis-mesh/v1',
    meshIdentity: `${policy.caseId}-${state.elementFamily}-H${String(h).replace('.', '_')}-PROBE-STABLE-RECTANGLE`,
    nodes: [...state.nodes].map(([id, point]) => ({ nodeId: id, ...point }))
      .sort((a, b) => a.nodeId.localeCompare(b.nodeId, undefined, { numeric: true })),
    elements: [...state.elements].sort((a, b) => a.elementId.localeCompare(b.elementId, undefined, { numeric: true })),
  });
}
function characteristicLengths(mesh) {
  const nodeById = new Map(mesh.nodes.map((row) => [row.nodeId, row]));
  const values = [];
  for (const element of mesh.elements) {
    const cornerCount = element.elementType === 'Q8' ? 4 : 3;
    const corners = element.nodeIds.slice(0, cornerCount);
    for (let index = 0; index < corners.length; index += 1) {
      const a = nodeById.get(corners[index]);
      const b = nodeById.get(corners[(index + 1) % corners.length]);
      values.push(Math.hypot(b.x - a.x, b.y - a.y));
    }
  }
  return values;
}
function requireFrozenLevel(policy, value) {
  if (!Number.isFinite(value)) fail(policy.errorPrefix, 'TARGET_H_INVALID');
  const match = policy.hLevels.find((h) => Math.abs(h - value) <= 1e-12 * Math.max(1, h));
  if (match === undefined) fail(policy.errorPrefix, 'TARGET_H_NOT_FROZEN_LEVEL');
  return match;
}
function nodeId(i, j) { return `N-C${i}-R${j}`; }
function addNode(state, id, x, y) { state.nodes.set(id, Object.freeze({ x: clean(x), y: clean(y), z: 0 })); }
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
function clean(value) { return Math.abs(value) < 1e-10 ? 0 : value; }
function fail(prefix, code) { const error = new TypeError(`${prefix}_${code}`); error.code = `${prefix}_${code}`; throw error; }
function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
