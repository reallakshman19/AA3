import { PRESSURE_SENSES } from './constants.js';
import { canonicalPressureLoad } from './canonical-records.js';
import { buildExperimentalMitcElementEvidence } from './mitc-adoption-element.js';
import {
  MITC_ADOPTION_PRODUCTION_QUALIFICATION,
  MITC_ADOPTION_ROUTE_STATUS,
  validateExperimentalMitcAdoptionModel,
} from './mitc-adoption-model.js';
import {
  MITC3_FORMULATION,
  MITC3_GAUSS_POINTS,
  jacobianOf,
  triangleShapeFunctions,
} from './mitc3-element.js';
import {
  MITC4_FORMULATION,
  MITC4_GAUSS_POINTS,
  jacobianAt,
  q4ShapeFunctionsAndDerivatives,
} from './mitc4-element.js';
import { generalizedTotals } from './loads.js';
import { deepFreeze } from './json.js';
import { maxAbs, qualification } from './numeric.js';
import { add, cross, scale, subtract } from './vector.js';
import { uniqueBy } from './validation.js';

export const MITC_ADOPTION_PRESSURE_FORMULA_ID =
  'LAFEA4.MITC_CONSISTENT_REFERENCE_PRESSURE/v1';

/**
 * Build pressure-load evidence for the experimental MITC adoption boundary.
 * This does not solve the model and is not reachable from registered LAFEA.4.
 * The force vector uses the existing global shell order [UX,UY,UZ,R1,R2].
 */
export function assembleExperimentalMitcPressureLoads(model, pressureLoads) {
  const canonical = validateExperimentalMitcAdoptionModel(model);
  if (!Array.isArray(pressureLoads)) throw new TypeError('MITC pressure loads must be an array');
  const loads = pressureLoads.map(canonicalPressureLoad);
  uniqueBy(loads, 'pressureLoadId', 'pressureLoadId');
  uniqueBy(loads, 'elementId', 'pressure application on element');

  const elements = buildExperimentalMitcElementEvidence(canonical);
  const elementMap = new Map(elements.map((element) => [element.elementId, element]));
  const nodeMap = new Map(canonical.nodes.map((node) => [node.nodeId, node]));
  const dofOrdering = canonical.nodes.flatMap((node) => [
    'UX', 'UY', 'UZ', 'R1', 'R2',
  ].map((dof) => `${node.nodeId}:${dof}`));
  const dofIndex = new Map(dofOrdering.map((identity, index) => [identity, index]));
  const forceVector = Array(dofOrdering.length).fill(0);
  const contributions = loads.map((load) => {
    const element = elementMap.get(load.elementId);
    if (!element) throw new TypeError(`Unresolved MITC pressure element ${load.elementId}`);
    const evidence = consistentPressureContribution(
      canonical,
      element,
      load,
      nodeMap,
    );
    addContribution(forceVector, evidence, dofIndex);
    return evidence;
  });
  const totals = generalizedTotals(canonical.nodes, forceVector);
  return deepFreeze({
    routeStatus: MITC_ADOPTION_ROUTE_STATUS,
    contributesToLafea4ProductionQualification: MITC_ADOPTION_PRODUCTION_QUALIFICATION,
    pressureSenseAuthority: [...PRESSURE_SENSES],
    geometryConfiguration: 'UNDEFORMED_REFERENCE_CONFIGURATION',
    followerLoadAuthority: false,
    dofOrdering,
    forceVector,
    appliedForce: totals.force,
    appliedMomentAboutOrigin: totals.moment,
    contributions,
    formulaIds: [MITC_ADOPTION_PRESSURE_FORMULA_ID],
  });
}

function consistentPressureContribution(model, element, load, nodeMap) {
  const sign = load.sense === 'ALONG_ELEMENT_NORMAL' ? 1 : -1;
  const signedNormal = scale(element.localFrame.ez, sign);
  const integration = element.formulation === MITC4_FORMULATION
    ? integrateMitc4(element, nodeMap, signedNormal, load.pressure)
    : integrateMitc3(element, nodeMap, signedNormal, load.pressure);
  const totalForce = integration.nodalForces.reduce(add, [0, 0, 0]);
  const totalMomentAboutOrigin = integration.nodalForces.reduce(
    (total, force, index) => add(
      total,
      cross(nodeMap.get(element.nodeIds[index]).position, force),
    ),
    [0, 0, 0],
  );
  const forceResidual = maxAbs(subtract(totalForce, integration.quadratureForce));
  const momentResidual = maxAbs(subtract(
    totalMomentAboutOrigin,
    integration.quadratureMomentAboutOrigin,
  ));
  const forceScale = Math.max(1, maxAbs(integration.quadratureForce));
  const momentScale = Math.max(1, maxAbs(integration.quadratureMomentAboutOrigin));
  const forceParity = qualification(
    forceResidual,
    forceScale,
    model.qualificationProfile.forceEquilibrium,
  );
  const momentParity = qualification(
    momentResidual,
    momentScale,
    model.qualificationProfile.momentEquilibrium,
  );
  if (!forceParity.accepted || !momentParity.accepted) {
    const error = new TypeError(`MITC pressure load ${load.pressureLoadId} failed force/moment parity`);
    error.code = 'MITC_ADOPTION_PRESSURE_PARITY_FAILED';
    error.evidence = { forceParity, momentParity };
    throw error;
  }
  return {
    type: 'MITC_CONSISTENT_REFERENCE_PRESSURE',
    pressureLoadId: load.pressureLoadId,
    elementId: element.elementId,
    formulation: element.formulation,
    topology: element.topology,
    pressure: load.pressure,
    sense: load.sense,
    signedNormal,
    representedArea: integration.nodalAreaWeights.reduce((sum, value) => sum + value, 0),
    nodalAreaWeights: integration.nodalAreaWeights,
    nodalForces: integration.nodalForces,
    totalForce,
    totalMomentAboutOrigin,
    quadratureForce: integration.quadratureForce,
    quadratureMomentAboutOrigin: integration.quadratureMomentAboutOrigin,
    forceParity,
    momentParity,
    geometryConfiguration: 'UNDEFORMED_REFERENCE_CONFIGURATION',
    followerLoadAuthority: false,
    sourceReference: load.sourceReference,
    formulaId: MITC_ADOPTION_PRESSURE_FORMULA_ID,
  };
}

function integrateMitc4(element, nodeMap, signedNormal, pressure) {
  const nodeCount = 4;
  const nodalAreaWeights = Array(nodeCount).fill(0);
  const quadrature = initializeQuadratureTotals();
  for (const point of MITC4_GAUSS_POINTS) {
    const shape = q4ShapeFunctionsAndDerivatives(point.xi, point.eta);
    const jacobian = jacobianAt(
      element.localCoordinates,
      shape.dNdXi,
      shape.dNdEta,
    );
    requirePositiveJacobian(jacobian.determinant, element.elementId, point.pointId);
    const differentialArea = point.weight * jacobian.determinant;
    accumulateQuadrature(
      quadrature,
      element,
      nodeMap,
      shape.N,
      differentialArea,
      signedNormal,
      pressure,
    );
    for (let node = 0; node < nodeCount; node += 1) {
      nodalAreaWeights[node] += shape.N[node] * differentialArea;
    }
  }
  return integratedResult(nodalAreaWeights, signedNormal, pressure, quadrature);
}

function integrateMitc3(element, nodeMap, signedNormal, pressure) {
  const nodeCount = 3;
  const nodalAreaWeights = Array(nodeCount).fill(0);
  const jacobian = jacobianOf(element.localCoordinates);
  const quadrature = initializeQuadratureTotals();
  for (const point of MITC3_GAUSS_POINTS) {
    const shape = triangleShapeFunctions(point.r, point.s);
    const differentialArea = point.weight * jacobian.determinant;
    accumulateQuadrature(
      quadrature,
      element,
      nodeMap,
      shape.N,
      differentialArea,
      signedNormal,
      pressure,
    );
    for (let node = 0; node < nodeCount; node += 1) {
      nodalAreaWeights[node] += shape.N[node] * differentialArea;
    }
  }
  return integratedResult(nodalAreaWeights, signedNormal, pressure, quadrature);
}

function initializeQuadratureTotals() {
  return { force: [0, 0, 0], moment: [0, 0, 0] };
}

function accumulateQuadrature(
  totals,
  element,
  nodeMap,
  shape,
  differentialArea,
  signedNormal,
  pressure,
) {
  const differentialForce = scale(signedNormal, pressure * differentialArea);
  const position = shape.reduce(
    (total, value, index) => add(
      total,
      scale(nodeMap.get(element.nodeIds[index]).position, value),
    ),
    [0, 0, 0],
  );
  totals.force = add(totals.force, differentialForce);
  totals.moment = add(totals.moment, cross(position, differentialForce));
}

function integratedResult(nodalAreaWeights, signedNormal, pressure, quadrature) {
  return {
    nodalAreaWeights,
    nodalForces: nodalAreaWeights.map((weight) => scale(
      signedNormal,
      pressure * weight,
    )),
    quadratureForce: quadrature.force,
    quadratureMomentAboutOrigin: quadrature.moment,
  };
}

function addContribution(vector, contribution, dofIndex) {
  contribution.nodalForces.forEach((force, nodeIndex) => {
    const nodeId = contributionNodeId(contribution, nodeIndex);
    ['UX', 'UY', 'UZ'].forEach((dof, axis) => {
      vector[dofIndex.get(`${nodeId}:${dof}`)] += force[axis];
    });
  });
}

function contributionNodeId(contribution, nodeIndex) {
  // nodeIds are retained through the element evidence in the same order as
  // nodalAreaWeights/nodalForces. Keeping them in the contribution prevents
  // any later consumer from inferring topology from vector position.
  return contribution.nodeIds[nodeIndex];
}

function requirePositiveJacobian(determinant, elementId, pointId) {
  if (!(determinant > 0)) {
    throw new TypeError(
      `MITC pressure Jacobian must be positive for ${elementId} at ${pointId}; got ${determinant}`,
    );
  }
}
