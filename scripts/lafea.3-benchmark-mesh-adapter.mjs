import { canonicalTopology } from '../src/core/lafea-geometry/index.js';
import { mappedTransfiniteMesh, triangulateRegion } from '../src/core/lafea-meshing/index.js';
import { buildBoundaryEdges } from '../src/core/local-continuum/assembly.js';

/**
 * Benchmark-only glue: turns Phase B's geometry/meshing kernel output (T6
 * elements as bare node positions, per `upgradeToT6`) into a global,
 * deduplicated node/element list a `local-continuum` model can reference by
 * ID. Not part of either kernel's public surface — this is test/benchmark
 * infrastructure, the mesh-generation equivalent of `lafea.3-fixtures.mjs`.
 *
 * Node identity is by exact coordinate match: a shared corner or midside
 * node between two adjacent T6 elements is always the same deterministic
 * floating-point computation (the same shared index into the mesher's
 * `points` array, or the same analytic curve evaluation), so exact-key
 * deduplication (with a generous `toFixed` snap as a safety margin, not a
 * tolerance the mesher actually relies on) is reliable, not approximate.
 */
export function meshRegionToElements(topologySource, regionId, discretizationOptions) {
  const topology = canonicalTopology(topologySource);
  const t6Elements = triangulateRegion(topology, regionId, discretizationOptions);
  return globalizeElements(t6Elements);
}

/**
 * Structured Q8 mesh of an annulus sector, via the kernel's own
 * `mappedTransfiniteMesh` Coons-patch blender fed exact analytic polar
 * boundary chains. Used where a benchmark needs genuine two-directional
 * refinement: the T6 triangulator above refines only the boundary
 * discretization (it inserts no interior Steiner points), so refining an
 * annulus arc there thins elements circumferentially while leaving the
 * radial direction fixed — element aspect ratio degrades instead of
 * improving, and a convergence study on it would be meaningless. That is a
 * disclosed limitation of the current triangulator, not of the elements
 * under test.
 */
export function mappedAnnulusSectorQ8(innerRadius, outerRadius, sweepRadians, radialElements, circumferentialElements, radialBias = 1) {
  const polar = (radius, angle) => ({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
  // `radialBias > 1` grades the radial spacing geometrically toward the inner
  // radius — necessary to resolve a steep near-bore boundary layer (e.g. the
  // Kirsch a^2/r^2 terms) rather than averaging straight through it.
  const radialFraction = (s) => (radialBias === 1 ? s : (radialBias ** s - 1) / (radialBias - 1));

  const buildChainWithMidpoints = (corners) => {
    const chain = [];
    for (let i = 0; i < corners.length - 1; i += 1) {
      chain.push(corners[i]);
      chain.push({
        x: 0.5 * (corners[i].x + corners[i + 1].x),
        y: 0.5 * (corners[i].y + corners[i + 1].y),
      });
    }
    chain.push(corners[corners.length - 1]);
    return chain;
  };

  const arcCorners = (radius) => Array.from(
    { length: circumferentialElements + 1 },
    (_, i) => polar(radius, sweepRadians * (i / circumferentialElements)),
  );
  const radialCorners = (angle) => Array.from(
    { length: radialElements + 1 },
    (_, j) => polar(
      innerRadius + (outerRadius - innerRadius) * radialFraction(j / radialElements),
      angle,
    ),
  );

  const arcChain = (radius) => buildChainWithMidpoints(arcCorners(radius));
  const radialChain = (angle) => buildChainWithMidpoints(radialCorners(angle));

  // u runs radially outward, v circumferentially: with u tangential instead,
  // the mesher's corner order (u0v0, u1v0, u1v1, u0v1) traverses clockwise in
  // polar coordinates, which `local-continuum` correctly rejects.
  const mesh = mappedTransfiniteMesh(
    radialChain(0), radialChain(sweepRadians), arcChain(innerRadius), arcChain(outerRadius),
  );
  return globalizeElements(mesh.elements);
}

function globalizeElements(t6Elements) {
  const nodeIndex = new Map();
  const nodes = [];
  let counter = 0;
  const nodeIdFor = (point) => {
    const key = `${point.x.toFixed(9)}:${point.y.toFixed(9)}`;
    if (!nodeIndex.has(key)) {
      const nodeId = `N${counter}`;
      counter += 1;
      nodeIndex.set(key, nodeId);
      nodes.push({ nodeId, x: point.x, y: point.y });
    }
    return nodeIndex.get(key);
  };
  const elements = t6Elements.map((element, index) => ({
    elementId: `E${index}`,
    elementType: element.elementType,
    nodeIds: element.nodes.map((node) => nodeIdFor(node)),
  }));
  return { nodes, elements };
}

/** Boundary edges (from the assembled mesh's own boundary-edge detector) whose every node satisfies `predicate(node)`. */
export function boundaryEdgesWhere(elements, nodesById, predicate) {
  const boundary = buildBoundaryEdges(elements);
  return boundary.filter((edge) => edge.edgeNodeSequence.every((nodeId) => predicate(nodesById.get(nodeId))));
}
