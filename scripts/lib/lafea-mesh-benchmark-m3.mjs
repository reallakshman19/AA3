/**
 * Inspect production mesh/quality evidence and apply the Owner-approved M3 v2
 * refinement gate. Inputs are retained producer outputs; no mesh is mutated.
 * Missing, nonfinite or blocked evidence fails closed. Shape trends and sampled
 * T6 cyclic diagnostics do not authorize physics, recovery or release results.
 */
import {
  jacobianAt,
  scaledJacobianAt,
  t6ShapeFunctions,
} from '../../src/core/lafea-meshing/element-geometry.js';

/** @typedef {ReturnType<typeof import('../../src/workspace/lafea-analysis-mesh-contract.js').canonicalLafeaAnalysisMesh>} Mesh */
/** @typedef {ReturnType<typeof import('../../src/workspace/lafea-analysis-mesh-contract.js').qualifyLafeaAnalysisMesh>} Quality */
/** @typedef {{sampleCount:number, minimum:number|null, median:number|null, maximum:number|null, valid:boolean}} Lengths */
/** @typedef {{meshHash:string, nodeCount:number, elementCount:number, resourceDisposition:string, qualityWorstStatus:string, meshEvidence:ReturnType<typeof inspectM3Mesh>, seamConforming:boolean|null, maximumSeamPairDistance:number|null, adjacentSizeRatio:Quality['adjacentSizeRatio'], sizeToThickness:{blockCount:number}|null}} Level */

export const M3_POLICY_ID = 'BM-MESH-M3-MEASURED-REFINEMENT-v2';

/** @param {readonly number[]} values @param {number} expectedCount @returns {Lengths} */
function measuredLengths(values, expectedCount) {
  const valid = expectedCount > 0 && values.length === expectedCount
    && values.every((value) => Number.isFinite(value) && value > 0);
  if (!valid) return { sampleCount: values.length, minimum: null, median: null, maximum: null, valid: false };
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return {
    sampleCount: sorted.length,
    minimum: sorted[0],
    median: sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2,
    maximum: sorted.at(-1),
    valid: true,
  };
}

/** @param {Mesh} mesh @param {Quality} quality */
export function inspectM3Mesh(mesh, quality) {
  const rows = quality?.elementResults ?? [];
  const elements = new Map(mesh.elements.map((element) => [element.elementId, element]));
  const lengths = measuredLengths(rows.map((row) => row.characteristicLength), mesh.elements.length);
  const complete = lengths.valid && quality?.elementCount === mesh.elements.length
    && new Set(rows.map((row) => row.elementId)).size === mesh.elements.length
    && rows.every((row) => {
      const element = elements.get(row.elementId);
      const required = element?.elementType === 'Q8'
        ? ['ASPECT_RATIO', 'SCALED_JACOBIAN']
        : ['ASPECT_RATIO', 'SCALED_JACOBIAN', 'MINIMUM_ANGLE_DEGREES'];
      return element && element.elementType === row.elementType
        && ['OK', 'WARNING'].includes(row.worstStatus)
        && required.every((name) => {
          const metrics = row.metrics?.filter((metric) => metric.metric === name) ?? [];
          return metrics.length === 1 && Number.isFinite(metrics[0].value)
            && metrics[0].value > 0 && ['OK', 'WARNING'].includes(metrics[0].status);
        });
    }) && Array.isArray(quality?.gateResults) && quality.gateResults.length > 0
    && quality.gateResults.every((gate) => Number.isFinite(gate.value)
      && ['OK', 'WARNING'].includes(gate.status))
    && Array.isArray(quality?.blockingElementIds) && quality.blockingElementIds.length === 0
    && ['OK', 'WARNING'].includes(quality?.worstStatus);
  return {
    complete,
    measuredLengths: lengths,
    worstElements: complete ? worstElements(mesh, quality) : [],
  };
}

/** @param {Mesh} mesh @param {Quality} quality */
function worstElements(mesh, quality) {
  const nodeById = new Map(mesh.nodes.map((node) => [node.nodeId, node]));
  const metricNames = ['ASPECT_RATIO', 'MINIMUM_ANGLE_DEGREES', 'SCALED_JACOBIAN'];
  return metricNames.flatMap((metricName) => {
    const candidates = quality.elementResults.flatMap((row) => row.metrics
      .filter((metric) => metric.metric === metricName)
      .map((metric) => ({ elementId: row.elementId, value: metric.value })));
    candidates.sort((a, b) => (metricName === 'ASPECT_RATIO' ? b.value - a.value : a.value - b.value)
      || a.elementId.localeCompare(b.elementId));
    if (candidates.length === 0) return [];
    const selected = candidates[0];
    const element = mesh.elements.find((row) => row.elementId === selected.elementId);
    const nodes = element.nodeIds.map((id) => nodeById.get(id));
    return [{
      selectedByMetric: metricName,
      metricValue: selected.value,
      element,
      nodes,
      t6Mapping: element.elementType === 'T6' ? t6MappingDiagnosis(nodes) : null,
    }];
  });
}

/** @param {Mesh['nodes']} nodes */
function t6MappingDiagnosis(nodes) {
  const points = [{ xi: 0, eta: 0 }, { xi: 1, eta: 0 }, { xi: 0, eta: 1 },
    { xi: 1 / 6, eta: 1 / 6 }, { xi: 2 / 3, eta: 1 / 6 }, { xi: 1 / 6, eta: 2 / 3 }];
  const midsideOffsets = [0, 1, 2].map((i) => Math.hypot(
    nodes[i + 3].x - (nodes[i].x + nodes[(i + 1) % 3].x) / 2,
    nodes[i + 3].y - (nodes[i].y + nodes[(i + 1) % 3].y) / 2,
  ));
  const cyclicMappings = [0, 1, 2].map((shift) => {
    const permutation = [0, 1, 2].map((i) => (i + shift) % 3);
    const ordered = [...permutation, ...permutation.map((i) => i + 3)].map((i) => nodes[i]);
    const samples = points.map(({ xi, eta }) => ({
      xi, eta,
      determinant: jacobianAt(t6ShapeFunctions(xi, eta), ordered).determinant,
      scaledJacobian: scaledJacobianAt(t6ShapeFunctions(xi, eta), ordered),
    }));
    return { shift, nodeIds: ordered.map((node) => node.nodeId), samples,
      minimumScaledJacobian: Math.min(...samples.map((sample) => sample.scaledJacobian)) };
  });
  return { midsideOffsets, cyclicMappings, usage: 'DIAGNOSIS_ONLY_NO_CONNECTIVITY_OR_METRIC_MUTATION' };
}

/**
 * Additional v2 gates. The caller also retains frozen requested-ladder checks
 * and predecessor/source custody. Existing shape trends are reported separately.
 * @param {readonly Level[]} levels @param {string} stageId
 */
export function qualifyM3MeasuredRefinement(levels, stageId) {
  const levelChecks = levels.map((level) => {
    const measured = level.meshEvidence?.measuredLengths;
    const complete = level.meshEvidence?.complete === true && measured?.valid === true
      && measured.sampleCount === level.elementCount
      && [measured.minimum, measured.median, measured.maximum].every((value) => Number.isFinite(value) && value > 0)
      && measured.minimum <= measured.median && measured.median <= measured.maximum;
    const shellPass = stageId !== 'LAFEA.4' || (level.seamConforming === true
      && Number.isFinite(level.maximumSeamPairDistance) && level.maximumSeamPairDistance >= 0
      && level.maximumSeamPairDistance <= Number.EPSILON * 256
      && level.adjacentSizeRatio?.qualification === 'PASS'
      && level.adjacentSizeRatio.violatingAdjacencyCount === 0
      && Number.isFinite(level.adjacentSizeRatio.maximumObserved)
      && level.sizeToThickness?.blockCount === 0);
    return {
      complete,
      shellPass,
      status: complete && shellPass && level.resourceDisposition === 'WITHIN_LIMITS'
        && ['OK', 'WARNING'].includes(level.qualityWorstStatus) ? 'PASS' : 'FAIL',
    };
  });
  const refinementChecks = levels.slice(1).map((fine, i) => {
    const coarse = levels[i];
    const coarseMaximum = coarse.meshEvidence?.measuredLengths?.maximum;
    const fineMaximum = fine.meshEvidence?.measuredLengths?.maximum;
    const decreases = Number.isFinite(coarseMaximum) && Number.isFinite(fineMaximum)
      && fineMaximum > 0 && fineMaximum < coarseMaximum;
    return {
      coarseMaximum, fineMaximum, decreases,
      status: decreases && fine.nodeCount > coarse.nodeCount && fine.elementCount > coarse.elementCount
        && fine.meshHash !== coarse.meshHash ? 'PASS' : 'FAIL',
    };
  });
  return {
    policyId: M3_POLICY_ID,
    status: ['LAFEA.3', 'LAFEA.4'].includes(stageId) && levels.length === 3
      && new Set(levels.map((level) => level.meshHash)).size === 3
      && levelChecks.every((row) => row.status === 'PASS')
      && refinementChecks.every((row) => row.status === 'PASS') ? 'PASS' : 'FAIL',
    levelChecks,
    refinementChecks,
  };
}
