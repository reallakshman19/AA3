import { CODE_POINT_INTERPOLATION_METHOD, LOCAL_ACTION_FIELDS, compareAscii, fail } from './recovery-contract.js';

/**
 * Component code-point resultant recovery (section 9 "Component result",
 * section 9.1 code-point stations).
 *
 * Every code station B-3.2 currently publishes (`CODE_STATION_KEYS`: bend
 * tangent/mid-arc, reducer section change, valve/flange ends) carries a
 * `nodeId` that is exactly the I or J node of one of the component's own
 * compiled elements — that correspondence is why the bend subdivision is
 * forced to an even element count (so the mid-arc station "falls exactly on
 * a node", per B-3.2's own README). `EXACT_NODE_ELEMENT_END_MATCH_V1` is
 * therefore the one interpolation/extrapolation method this package
 * implements: locate the element end whose node matches the station, and
 * report that end's already-recovered action directly. A station that does
 * not land on any compiled element's node is refused rather than smoothed
 * across the gap (section 9.1: "never uses visually smoothed viewport
 * values") — off-node interpolation is not exercised by any current B-3.2
 * component and is not invented here to cover a case that cannot yet occur.
 *
 * An internal chain node (a bend/reducer station shared by one element's J
 * end and the next element's I end) has two candidates. Both are real, and
 * physically the same joint, but a joint's two attached end actions are not
 * simply equal: the frozen B-2.0 `oppositeAction` rule
 * (`ELEMENT_ACTION_ON_JOINT_IS_NEGATIVE_OF_REPORTED_END_ACTION`) means each
 * attached element's reported action is the joint *pushing on the element*,
 * so nodal equilibrium at that joint (no other attachment, section 4.3
 * component spans carry no load primitives of their own) reads
 * `candidate1.global + candidate2.global = externalNodalLoadAtNode`, not
 * `candidate1 == candidate2`. Comparing the two candidates' raw local values
 * for equality is exactly the bug this check exists to catch — it is wrong
 * by a sign, and every worked example disagrees by very nearly a factor of
 * two rather than by solver noise. The check below compares in *global*
 * components (local axes can differ in orientation between two elements at a
 * junction) and folds in any NODAL_FORCE_MOMENT applied directly at that
 * node, so the evidence is a real free-body balance rather than an equality
 * that happens to hold only when nothing is attached at the far side.
 */

/**
 * The structural node a station sits on.
 *
 * The station's own name is honoured first, so a caller that did bind the
 * component's identity space keeps working unchanged. Otherwise the station is
 * located by where it sits along the component's element chain: elements
 * e0..e(n-1) in the component's own order span nodes N0..Nn, with N0 = e0's I
 * end and Nk = e(k-1)'s J end, and `arcFraction` says which of those the
 * station is. Only exact chain positions resolve; a station part-way along an
 * element has no node and is refused by the caller rather than interpolated.
 */
function resolveStationNodeId({ station, componentElementIds, modelElementsById }) {
  const named = findElementNodeCandidates({ componentElementIds, modelElementsById, nodeId: station.nodeId });
  if (named.length > 0) return station.nodeId;

  const elementCount = componentElementIds.length;
  const fraction = Number(station.arcFraction);
  if (elementCount === 0 || !Number.isFinite(fraction)) return station.nodeId;
  const index = fraction * elementCount;
  if (!Number.isInteger(index) || index < 0 || index > elementCount) return station.nodeId;

  const element = index === 0
    ? modelElementsById.get(componentElementIds[0])
    : modelElementsById.get(componentElementIds[index - 1]);
  if (element === undefined) return station.nodeId;
  return index === 0 ? element.nodeI : element.nodeJ;
}

function findElementNodeCandidates({ componentElementIds, modelElementsById, nodeId }) {
  const candidates = [];
  for (const elementId of componentElementIds) {
    const modelElement = modelElementsById.get(elementId);
    if (modelElement === undefined) continue;
    if (modelElement.nodeI === nodeId) candidates.push({ elementId, end: 'I' });
    if (modelElement.nodeJ === nodeId) candidates.push({ elementId, end: 'J' });
  }
  candidates.sort((left, right) => compareAscii(left.elementId, right.elementId) || compareAscii(left.end, right.end));
  return candidates;
}

/**
 * Worst normalized nodal-equilibrium residual between two elements' actions
 * at the shared joint: `primary + other - externalLoad`, each term in global
 * components (`ELEMENT_ACTION_ON_JOINT_IS_NEGATIVE_OF_REPORTED_END_ACTION`
 * applied to both sides cancels the sign, turning the joint balance into a
 * sum rather than a difference).
 */
function worstEquilibriumResidual(primaryGlobal, otherGlobal, externalLoad) {
  let worst = 0;
  for (const field of LOCAL_ACTION_FIELDS) {
    const balance = primaryGlobal[field] + otherGlobal[field] - externalLoad[field];
    const scale = Math.max(Math.abs(primaryGlobal[field]), Math.abs(otherGlobal[field]), 1);
    worst = Math.max(worst, Math.abs(balance) / scale);
  }
  return worst;
}

/**
 * @param {object} args
 * @param {object} args.station One `CODE_STATION_KEYS` entry from a sealed piping component.
 * @param {Array<string>} args.componentElementIds `component.elements[].elementId`, in the component's own order.
 * @param {Map<string,object>} args.modelElementsById `model.elements`, keyed by `elementId` (for `nodeI`/`nodeJ`).
 * @param {Map<string,object>} args.actionByElementId Recovered `{local:{I,J}, global:{I,J}}` per elementId.
 * @param {Map<string,object>} args.nodalLoadByNode Summed global `NODAL_FORCE_MOMENT` load per nodeId (zero-filled lookups are the caller's job; missing entries are treated as zero here).
 * @param {number} args.tolerance Declared `codePointConsistencyTolerance`.
 * @returns {object} One `CODE_POINT_RESULTANT_KEYS` entry.
 */
export function recoverComponentCodePoint({
  station, componentElementIds, modelElementsById, actionByElementId, nodalLoadByNode, tolerance,
}) {
  // A component names its stations in its own identity space
  // (`${componentId}.N${index}`) because it is compiled without knowledge of
  // where the caller will bind it. The model binds the same chords to real
  // geometry nodes. Matching on the station's own name therefore succeeds only
  // when a caller happens to have used that naming, and fails for every model
  // that binds real nodes -- which is every real model. Resolving through the
  // element chain instead uses the correspondence that actually exists: the
  // component's elements ARE the model's elements, in order.
  const structuralNodeId = resolveStationNodeId({ station, componentElementIds, modelElementsById });
  const candidates = findElementNodeCandidates({ componentElementIds, modelElementsById, nodeId: structuralNodeId });
  if (candidates.length === 0) {
    fail(
      `Code station ${station.stationId} names node ${station.nodeId}, which is not the I or J end of any element this component compiled, and its position in the component's element chain does not resolve to one either; off-node code-point interpolation is not implemented and the station is refused rather than approximated.`,
      'RECOVERY_CODE_STATION_NOT_LOCATABLE',
    );
  }
  const primary = candidates[0];
  const primaryAction = actionByElementId.get(primary.elementId);
  const externalLoad = nodalLoadByNode.get(structuralNodeId) ?? { fx: 0, fy: 0, fz: 0, mx: 0, my: 0, mz: 0 };

  let consistency = null;
  for (let index = 1; index < candidates.length; index += 1) {
    const other = candidates[index];
    const otherAction = actionByElementId.get(other.elementId);
    const residual = worstEquilibriumResidual(
      primaryAction.global[primary.end],
      otherAction.global[other.end],
      externalLoad,
    );
    if (consistency === null || residual > consistency.residual) {
      consistency = {
        comparedElementId: other.elementId,
        comparedEnd: other.end,
        residual,
        tolerance,
        withinTolerance: residual <= tolerance,
      };
    }
  }
  if (consistency !== null && !consistency.withinTolerance) {
    fail(
      `Code station ${station.stationId} at node ${structuralNodeId} disagrees between ${primary.elementId}:${primary.end} and ${consistency.comparedElementId}:${consistency.comparedEnd} beyond the declared codePointConsistencyTolerance (residual ${consistency.residual} > ${tolerance}); the code point is not a reliable single value.`,
      'RECOVERY_CODE_POINT_INCONSISTENT',
    );
  }

  return {
    stationId: station.stationId,
    kind: station.kind,
    nodeId: structuralNodeId,
    position: [...station.position],
    arcFraction: station.arcFraction,
    elementId: primary.elementId,
    end: primary.end,
    method: CODE_POINT_INTERPOLATION_METHOD,
    local: primaryAction.local[primary.end],
    global: primaryAction.global[primary.end],
    consistency,
  };
}
