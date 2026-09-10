/**
 * B02C graded polar mesh for the quarter-annulus (hole r=10, outer r=100).
 *
 * Root cause this exists to fix: the generic mesher applies one uniform
 * global target element length to both radial and circumferential
 * directions. Near the hole (small radius), the circumferential arc a
 * sector spans is short relative to that global target length, so rings
 * near the hole -- especially for Q8 quads, which have no diagonal to
 * relieve the resulting elongation -- come out badly elongated
 * (worst-case aspect ratio ~10, pinned there regardless of h, since global
 * refinement refines every ring equally instead of grading toward the
 * hole). T3/T6 tolerate this better since a bad quad splits into a
 * reasonable triangle either side, but Q8 has no such relief and BLOCKs the
 * mesh-quality gate at every tested refinement level.
 *
 * Fix: grade the radial ring spacing geometrically (r_i = a*(R/a)^(i/N_r))
 * so each ring's radial thickness scales with its own radius, matching a
 * fixed circumferential-sector count -- this is the standard technique for
 * annular/polar meshing with a large outer/inner radius ratio, and keeps
 * aspect ratio roughly constant (and reasonable) across every ring.
 */
import { canonicalLafeaSha256 } from '../../workspace/lafea-canonical-sha256.js';

export const LAFEA_B02C_GRADED_POLAR_STRATEGY = 'B02C_GRADED_POLAR';
export const LAFEA_B02C_GRADED_POLAR_POLICY_ID = 'B02C_GRADED_POLAR_POLICY_V1';

const GEOMETRY = Object.freeze({ centerX: 0, centerY: 0, holeRadius: 10, outerRadius: 100 });
// Frozen (h, angularSectors, radialRings) triples. angularSectors matches
// the frozen definition's curvatureToleranceDegrees (90/tol) so boundary
// curvature fidelity is unchanged from before; radialRings is chosen via
// rho = (R/a)^(1/radialRings) ~= 1 + (pi/2)/angularSectors (the grading
// condition that keeps ring aspect ratio close to 1), rounded to keep
// element/DOF counts within what this environment's solver handles in
// practical time (see LEVELS_BY_METHOD in the B02C definition JSON).
const LEVELS = Object.freeze([
  { h: 22.5, angularSectors: 8, radialRings: 13 },
  { h: 11.25, angularSectors: 16, radialRings: 25 },
  { h: 5.625, angularSectors: 8, radialRings: 25 },
]);

export function generateLafeaB02cGradedPolarMesh({ targetElementLength, elementFamily }) {
  if (!['T3', 'T6', 'Q8'].includes(elementFamily)) fail('LAFEA_B02C_GRADED_POLAR_ELEMENT_FAMILY_INVALID');
  const level = requireFrozenLevel(targetElementLength);
  const { angularSectors, radialRings } = level;
  const radii = radialGrading(GEOMETRY.holeRadius, GEOMETRY.outerRadius, radialRings);
  const angles = [];
  for (let s = 0; s <= angularSectors; s += 1) angles.push((90 * s) / angularSectors);
  const state = {
    nodes: new Map(), nodeMeta: new Map(), edgeMidpoints: new Map(), elements: [], elementFamily, radialRings,
  };
  for (let ring = 0; ring <= radialRings; ring += 1) {
    for (let sector = 0; sector <= angularSectors; sector += 1) {
      const theta = (angles[sector] * Math.PI) / 180;
      const id = cornerId(ring, sector);
      addNode(state, id, {
        x: GEOMETRY.centerX + radii[ring] * Math.cos(theta),
        y: GEOMETRY.centerY + radii[ring] * Math.sin(theta),
      });
      state.nodeMeta.set(id, { ring, radius: radii[ring] });
    }
  }
  for (let ring = 0; ring < radialRings; ring += 1) {
    for (let sector = 0; sector < angularSectors; sector += 1) {
      const innerA = cornerId(ring, sector); const outerA = cornerId(ring + 1, sector);
      const outerB = cornerId(ring + 1, sector + 1); const innerB = cornerId(ring, sector + 1);
      if (elementFamily === 'Q8') {
        addQ8(state, `E-R${ring}-S${sector}`, [innerA, outerA, outerB, innerB]);
      } else {
        addTriangle(state, `E-R${ring}-S${sector}-A`, [innerA, outerA, outerB]);
        addTriangle(state, `E-R${ring}-S${sector}-B`, [innerA, outerB, innerB]);
      }
    }
  }
  const mesh = analysisMesh(level.h, state);
  const lengths = characteristicLengths(mesh);
  const base = {
    mesh,
    nodeCount: mesh.nodes.length,
    elementCount: mesh.elements.length,
    estimatedDofs: mesh.nodes.length * 2,
    boundarySegmentCount: 2 * angularSectors + 2 * radialRings,
    characteristicLengthMin: Math.min(...lengths),
    characteristicLengthMedian: median(lengths),
    characteristicLengthMax: Math.max(...lengths),
    strategy: LAFEA_B02C_GRADED_POLAR_STRATEGY,
    strategyReason: 'FROZEN_GRADED_POLAR_POLICY',
    holeCount: 1,
    angularSectors,
    radialRings,
    targetElementLength,
    elementFamily,
    policyId: LAFEA_B02C_GRADED_POLAR_POLICY_ID,
  };
  return deepFreeze({
    ...base,
    semanticHash: canonicalLafeaSha256({ schema: 'lafea-b02c-graded-polar-mesh-output/v1', output: base }),
  });
}

/** Geometric radial grading: r_i = a*(R/a)^(i/N), i=0..N, so ring thickness scales with local radius. */
function radialGrading(a, r, n) {
  const ratio = r / a;
  const radii = [];
  for (let i = 0; i <= n; i += 1) radii.push(a * ratio ** (i / n));
  radii[0] = a; radii[n] = r; // exact endpoints, not just floating-point-close
  return radii;
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
  const firstMeta = state.nodeMeta.get(firstId); const secondMeta = state.nodeMeta.get(secondId);
  // Boundary-ring (hole or outer) circumferential edges must place their
  // midside node exactly on the circular arc, not the straight-chord
  // midpoint, or the solver can't map the mesh edge back to the HOLE_ARC /
  // OUTER_ARC geometry segment (needed to apply the analytical Kirsch
  // traction and to keep the boundary's curved shape for Q8/T6).
  if (firstMeta && secondMeta && firstMeta.ring === secondMeta.ring
    && (firstMeta.ring === 0 || firstMeta.ring === state.radialRings)) {
    const chordMidX = (first.x + second.x) / 2; const chordMidY = (first.y + second.y) / 2;
    const norm = Math.hypot(chordMidX, chordMidY);
    const radius = firstMeta.radius;
    addNode(state, id, { x: (chordMidX / norm) * radius, y: (chordMidY / norm) * radius });
    state.nodeMeta.set(id, { ring: firstMeta.ring, radius });
  } else {
    addNode(state, id, { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 });
  }
  state.edgeMidpoints.set(key, id);
  return id;
}
function analysisMesh(h, state) {
  return deepFreeze({
    schema: 'lafea-analysis-mesh/v1',
    meshIdentity: `B02C-${state.elementFamily}-H${String(h).replace('.', '_')}-GRADED-POLAR`,
    nodes: [...state.nodes].map(([id, point]) => ({ nodeId: id, ...point, z: 0 }))
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
function requireFrozenLevel(h) {
  const match = LEVELS.find((row) => Math.abs(row.h - h) <= 1e-9 * Math.max(1, row.h));
  if (!match) fail('LAFEA_B02C_GRADED_POLAR_TARGET_H_NOT_FROZEN_LEVEL');
  return match;
}
function cornerId(ring, sector) { return `N-R${ring}-S${sector}`; }
function addNode(state, id, point) { state.nodes.set(id, Object.freeze({ x: clean(point.x), y: clean(point.y) })); }
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
function clean(value) { return Math.abs(value) < 1e-10 ? 0 : value; }
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
