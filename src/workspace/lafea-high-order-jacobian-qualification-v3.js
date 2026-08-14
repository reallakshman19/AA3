/**
 * Fail-closed T6/Q8 mapping-positivity qualification.
 *
 * Existing corner/integration-point Jacobian sampling remains useful as a
 * diagnostic, but cannot prove det(J)>0 between samples. This module forms an
 * outward-rounded interval polynomial for det(J) and recursively certifies the
 * complete natural domain. Ambiguous regions block as UNPROVEN rather than
 * being accepted from sampling alone.
 */
import { canonicalLafeaAnalysisMesh } from './lafea-analysis-mesh-contract.js';
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';

export const LAFEA_HIGH_ORDER_JACOBIAN_QUALIFICATION_V3_SCHEMA =
  'lafea-high-order-jacobian-qualification/v3';

const T6_DXI = Object.freeze([
  poly([['0,0', -3], ['1,0', 4], ['0,1', 4]]),
  poly([['0,0', -1], ['1,0', 4]]), poly([]),
  poly([['0,0', 4], ['1,0', -8], ['0,1', -4]]),
  poly([['0,1', 4]]), poly([['0,1', -4]]),
]);
const T6_DETA = Object.freeze([
  poly([['0,0', -3], ['1,0', 4], ['0,1', 4]]), poly([]),
  poly([['0,0', -1], ['0,1', 4]]), poly([['1,0', -4]]),
  poly([['1,0', 4]]), poly([['0,0', 4], ['1,0', -4], ['0,1', -8]]),
]);
const Q8_DXI = Object.freeze([
  poly([['1,0', .5], ['0,1', .25], ['1,1', -.5], ['0,2', -.25]]),
  poly([['1,0', .5], ['0,1', -.25], ['1,1', -.5], ['0,2', .25]]),
  poly([['1,0', .5], ['0,1', .25], ['1,1', .5], ['0,2', .25]]),
  poly([['1,0', .5], ['0,1', -.25], ['1,1', .5], ['0,2', -.25]]),
  poly([['1,0', -1], ['1,1', 1]]), poly([['0,0', .5], ['0,2', -.5]]),
  poly([['1,0', -1], ['1,1', -1]]), poly([['0,0', -.5], ['0,2', .5]]),
]);
const Q8_DETA = Object.freeze([
  poly([['1,0', .25], ['0,1', .5], ['2,0', -.25], ['1,1', -.5]]),
  poly([['1,0', -.25], ['0,1', .5], ['2,0', -.25], ['1,1', .5]]),
  poly([['1,0', .25], ['0,1', .5], ['2,0', .25], ['1,1', .5]]),
  poly([['1,0', -.25], ['0,1', .5], ['2,0', .25], ['1,1', -.5]]),
  poly([['0,0', -.5], ['2,0', .5]]), poly([['0,1', -1], ['1,1', -1]]),
  poly([['0,0', .5], ['2,0', -.5]]), poly([['0,1', -1], ['1,1', 1]]),
]);

export function qualifyLafeaHighOrderJacobiansV3(meshValue, options = {}) {
  const mesh = canonicalLafeaAnalysisMesh(meshValue);
  const minimumDeterminant = finiteNonNegative(options.minimumDeterminant ?? 0, 'MINIMUM_DETERMINANT');
  const maximumDepth = integerRange(options.maximumDepth ?? 12, 0, 24, 'MAXIMUM_DEPTH');
  const maximumSubregions = integerRange(options.maximumSubregions ?? 8192, 1, 1_000_000, 'MAXIMUM_SUBREGIONS');
  const nodeById = new Map(mesh.nodes.map((node) => [node.nodeId, node]));
  const elementResults = mesh.elements.filter((element) => element.elementType === 'T6' || element.elementType === 'Q8')
    .map((element) => qualifyElement(element, nodeById, {
      minimumDeterminant, maximumDepth, maximumSubregions,
    }));
  const blockingElementIds = elementResults.filter((row) => row.status === 'BLOCK')
    .map((row) => row.elementId);
  const core = freeze({
    schema: LAFEA_HIGH_ORDER_JACOBIAN_QUALIFICATION_V3_SCHEMA,
    meshIdentity: mesh.meshIdentity,
    minimumDeterminant,
    maximumDepth,
    maximumSubregions,
    elementResults: freeze(elementResults),
    blockingElementIds: freeze(blockingElementIds),
    qualification: blockingElementIds.length ? 'BLOCK' : 'PASS',
  });
  return freeze({
    ...core,
    qualificationHash: canonicalLafeaSha256({
      schema: 'lafea-high-order-jacobian-qualification-hash-input/v3', evidence: core,
    }),
    engineeringAuthority: false,
  });
}

function qualifyElement(element, nodeById, options) {
  const nodes = element.nodeIds.map((nodeId) => nodeById.get(nodeId));
  const determinant = determinantPolynomial(element.elementType, nodes);
  const result = element.elementType === 'T6'
    ? certifyTriangleDomain(determinant, options)
    : certifyBoxDomain(determinant, options);
  return freeze({
    elementId: element.elementId,
    elementType: element.elementType,
    status: result.status,
    reason: result.reason,
    subregionCount: result.subregionCount,
    minimumCertifiedLowerBound: result.minimumCertifiedLowerBound,
    counterexampleNaturalPoint: result.counterexampleNaturalPoint,
  });
}
function determinantPolynomial(type, nodes) {
  const dxi = type === 'T6' ? T6_DXI : Q8_DXI;
  const deta = type === 'T6' ? T6_DETA : Q8_DETA;
  const dxDxi = coordinateDerivative(nodes, 'x', dxi);
  const dyDxi = coordinateDerivative(nodes, 'y', dxi);
  const dxDeta = coordinateDerivative(nodes, 'x', deta);
  const dyDeta = coordinateDerivative(nodes, 'y', deta);
  return polySub(polyMul(dxDxi, dyDeta), polyMul(dxDeta, dyDxi));
}
function coordinateDerivative(nodes, coordinate, derivativePolys) {
  let out = new Map();
  for (let index = 0; index < nodes.length; index += 1) {
    out = polyAdd(out, polyScale(derivativePolys[index], exactInterval(nodes[index][coordinate])));
  }
  return out;
}
function certifyBoxDomain(detPoly, options) {
  const stack = [{ x: interval(-1, 1), y: interval(-1, 1), depth: 0 }];
  let subregionCount = 0; let minimumCertifiedLowerBound = Infinity;
  while (stack.length) {
    const region = stack.pop(); subregionCount += 1;
    const sampled = boxSamples(region).map(([x, y]) => ({ x, y, value: evalPoly(detPoly, exactInterval(x), exactInterval(y)) }))
      .find((sample) => sample.value.hi <= options.minimumDeterminant);
    if (sampled) return blocked('NONPOSITIVE_COUNTEREXAMPLE', subregionCount, sampled, minimumCertifiedLowerBound);
    const bound = evalPoly(detPoly, region.x, region.y);
    if (bound.lo > options.minimumDeterminant) { minimumCertifiedLowerBound = Math.min(minimumCertifiedLowerBound, bound.lo); continue; }
    if (bound.hi <= options.minimumDeterminant) return blocked('NONPOSITIVE_INTERVAL_BOUND', subregionCount, null, minimumCertifiedLowerBound);
    if (region.depth >= options.maximumDepth || subregionCount >= options.maximumSubregions) return blocked('UNPROVEN_POSITIVITY', subregionCount, null, minimumCertifiedLowerBound);
    const xWidth = region.x.hi - region.x.lo; const yWidth = region.y.hi - region.y.lo;
    if (xWidth >= yWidth) {
      const mid = midpoint(region.x.lo, region.x.hi);
      stack.push({ x: interval(region.x.lo, mid), y: region.y, depth: region.depth + 1 });
      stack.push({ x: interval(mid, region.x.hi), y: region.y, depth: region.depth + 1 });
    } else {
      const mid = midpoint(region.y.lo, region.y.hi);
      stack.push({ x: region.x, y: interval(region.y.lo, mid), depth: region.depth + 1 });
      stack.push({ x: region.x, y: interval(mid, region.y.hi), depth: region.depth + 1 });
    }
  }
  return passed(subregionCount, minimumCertifiedLowerBound);
}
function certifyTriangleDomain(detPoly, options) {
  const stack = [{ vertices: [[0, 0], [1, 0], [0, 1]], depth: 0 }];
  let subregionCount = 0; let minimumCertifiedLowerBound = Infinity;
  while (stack.length) {
    const region = stack.pop(); subregionCount += 1;
    const sampled = triangleSamples(region.vertices).map(([x, y]) => ({ x, y, value: evalPoly(detPoly, exactInterval(x), exactInterval(y)) }))
      .find((sample) => sample.value.hi <= options.minimumDeterminant);
    if (sampled) return blocked('NONPOSITIVE_COUNTEREXAMPLE', subregionCount, sampled, minimumCertifiedLowerBound);
    const bounds = triangleBoundingBox(region.vertices); const bound = evalPoly(detPoly, bounds.x, bounds.y);
    if (bound.lo > options.minimumDeterminant) { minimumCertifiedLowerBound = Math.min(minimumCertifiedLowerBound, bound.lo); continue; }
    if (bound.hi <= options.minimumDeterminant) return blocked('NONPOSITIVE_INTERVAL_BOUND', subregionCount, null, minimumCertifiedLowerBound);
    if (region.depth >= options.maximumDepth || subregionCount >= options.maximumSubregions) return blocked('UNPROVEN_POSITIVITY', subregionCount, null, minimumCertifiedLowerBound);
    const [left, right] = splitTriangleLongestEdge(region.vertices);
    stack.push({ vertices: left, depth: region.depth + 1 });
    stack.push({ vertices: right, depth: region.depth + 1 });
  }
  return passed(subregionCount, minimumCertifiedLowerBound);
}
function passed(subregionCount, lower) { return { status: 'PASS', reason: 'CERTIFIED_POSITIVE', subregionCount, minimumCertifiedLowerBound: Number.isFinite(lower) ? lower : null, counterexampleNaturalPoint: null }; }
function blocked(reason, subregionCount, sample, lower) { return { status: 'BLOCK', reason, subregionCount, minimumCertifiedLowerBound: Number.isFinite(lower) ? lower : null, counterexampleNaturalPoint: sample ? freeze({ xi: sample.x, eta: sample.y }) : null }; }
function boxSamples(region) { const xm = midpoint(region.x.lo, region.x.hi); const ym = midpoint(region.y.lo, region.y.hi); return [[region.x.lo, region.y.lo], [region.x.hi, region.y.lo], [region.x.hi, region.y.hi], [region.x.lo, region.y.hi], [xm, ym]]; }
function triangleSamples(vertices) { return [...vertices, [(vertices[0][0] + vertices[1][0] + vertices[2][0]) / 3, (vertices[0][1] + vertices[1][1] + vertices[2][1]) / 3]]; }
function triangleBoundingBox(vertices) { return { x: interval(Math.min(...vertices.map((row) => row[0])), Math.max(...vertices.map((row) => row[0]))), y: interval(Math.min(...vertices.map((row) => row[1])), Math.max(...vertices.map((row) => row[1]))) }; }
function splitTriangleLongestEdge(vertices) {
  const edges = [[0, 1, 2], [1, 2, 0], [2, 0, 1]];
  const [a, b, opposite] = edges.reduce((best, row) => {
    const length2 = distance2(vertices[row[0]], vertices[row[1]]);
    return !best || length2 > best.length2 ? { row, length2 } : best;
  }, null).row;
  const middle = [midpoint(vertices[a][0], vertices[b][0]), midpoint(vertices[a][1], vertices[b][1])];
  return [[vertices[a], middle, vertices[opposite]], [middle, vertices[b], vertices[opposite]]];
}
function distance2(a, b) { return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2; }
function midpoint(a, b) { return a + (b - a) / 2; }
function poly(entries) { return new Map(entries.map(([key, value]) => [key, exactInterval(value)])); }
function polyAdd(a, b) { const out = new Map(a); for (const [key, value] of b) out.set(key, intervalAdd(out.get(key) ?? exactInterval(0), value)); return out; }
function polySub(a, b) { return polyAdd(a, polyScale(b, exactInterval(-1))); }
function polyScale(a, scalar) { const out = new Map(); for (const [key, value] of a) out.set(key, intervalMul(value, scalar)); return out; }
function polyMul(a, b) { const out = new Map(); for (const [leftKey, left] of a) for (const [rightKey, right] of b) { const [li, lj] = leftKey.split(',').map(Number); const [ri, rj] = rightKey.split(',').map(Number); const key = `${li + ri},${lj + rj}`; out.set(key, intervalAdd(out.get(key) ?? exactInterval(0), intervalMul(left, right))); } return out; }
function evalPoly(polynomial, x, y) { let out = exactInterval(0); for (const [key, coefficient] of polynomial) { const [i, j] = key.split(',').map(Number); out = intervalAdd(out, intervalMul(coefficient, intervalMul(intervalPow(x, i), intervalPow(y, j)))); } return out; }
function intervalPow(value, power) { let out = exactInterval(1); for (let index = 0; index < power; index += 1) out = intervalMul(out, value); return out; }
function exactInterval(value) { return { lo: value, hi: value }; }
function interval(lo, hi) { if (!(Number.isFinite(lo) && Number.isFinite(hi) && lo <= hi)) fail('LAFEA_HIGH_ORDER_JACOBIAN_V3_INTERVAL_INVALID'); return { lo, hi }; }
function intervalAdd(a, b) { return { lo: nextDown(a.lo + b.lo), hi: nextUp(a.hi + b.hi) }; }
function intervalMul(a, b) { const values = [a.lo * b.lo, a.lo * b.hi, a.hi * b.lo, a.hi * b.hi]; return { lo: nextDown(Math.min(...values)), hi: nextUp(Math.max(...values)) }; }
const FLOAT64_BUFFER = new ArrayBuffer(8); const FLOAT64_VIEW = new DataView(FLOAT64_BUFFER);
function nextUp(value) { if (Number.isNaN(value) || value === Infinity) return value; if (value === 0) return Number.MIN_VALUE; FLOAT64_VIEW.setFloat64(0, value, false); let bits = FLOAT64_VIEW.getBigUint64(0, false); bits += value > 0 ? 1n : -1n; FLOAT64_VIEW.setBigUint64(0, bits, false); return FLOAT64_VIEW.getFloat64(0, false); }
function nextDown(value) { if (Number.isNaN(value) || value === -Infinity) return value; if (value === 0) return -Number.MIN_VALUE; FLOAT64_VIEW.setFloat64(0, value, false); let bits = FLOAT64_VIEW.getBigUint64(0, false); bits += value > 0 ? -1n : 1n; FLOAT64_VIEW.setBigUint64(0, bits, false); return FLOAT64_VIEW.getFloat64(0, false); }
function finiteNonNegative(value, field) { if (!Number.isFinite(value) || value < 0) fail(`LAFEA_HIGH_ORDER_JACOBIAN_V3_${field}_INVALID`); return value; }
function integerRange(value, minimum, maximum, field) { if (!Number.isInteger(value) || value < minimum || value > maximum) fail(`LAFEA_HIGH_ORDER_JACOBIAN_V3_${field}_INVALID`); return value; }
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) { if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value; Object.values(value).forEach(freeze); return Object.freeze(value); }
