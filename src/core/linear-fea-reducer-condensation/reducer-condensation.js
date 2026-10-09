import { cleanNumber } from '../shared-analysis-contract/numeric.js';
import { closedEndPressureAxialStrain } from '../linear-fea-frame-element/frame-element.js';
import {
  distributedLoadLocalVector,
  frameLocalStiffness,
  thermalInitialStrainVector,
} from '../linear-fea-frame-element/index.js';
import {
  REDUCER_CONDENSATION_AUTHORITY_SCHEMA,
  REDUCER_SEGMENT_COUNT,
  requireReducerCondensationRequest,
  sealReducerCondensationAuthority,
} from './contract.js';

const CAESAR_PIPE_SHEAR_CORRECTION_FACTOR = 0.5;
const CAESAR_PIPE_SHEAR_SOURCE = 'INTERGRAPH-CAESAR-II-CAUX-2015-FKX-SHEAR-COEFFICIENT-2';

function annulus(outerDiameter, wallThickness) {
  const innerDiameter = outerDiameter - 2 * wallThickness;
  // SOURCE: classical circular-annulus section identities.
  const area = Math.PI * (outerDiameter ** 2 - innerDiameter ** 2) / 4;
  const secondMoment = Math.PI * (outerDiameter ** 4 - innerDiameter ** 4) / 64;
  return {
    outerDiameter: cleanNumber(outerDiameter),
    wallThickness: cleanNumber(wallThickness),
    innerDiameter: cleanNumber(innerDiameter),
    area: cleanNumber(area),
    secondMomentY: cleanNumber(secondMoment),
    secondMomentZ: cleanNumber(secondMoment),
    polarMoment: cleanNumber(2 * secondMoment),
  };
}

function interpolate(start, end, fraction) {
  return cleanNumber(start + fraction * (end - start));
}

function matrix(size, fill = 0) {
  return Array.from({ length: size }, () => new Array(size).fill(fill));
}

function vector(size) {
  return new Array(size).fill(0);
}

function addElementMatrix(global, local, nodeI, nodeJ) {
  const map = [
    ...Array.from({ length: 6 }, (_, index) => nodeI * 6 + index),
    ...Array.from({ length: 6 }, (_, index) => nodeJ * 6 + index),
  ];
  for (let row = 0; row < 12; row += 1) {
    for (let column = 0; column < 12; column += 1) {
      global[map[row]][map[column]] += local[row * 12 + column];
    }
  }
}

function addElementVector(global, local, nodeI, nodeJ) {
  const map = [
    ...Array.from({ length: 6 }, (_, index) => nodeI * 6 + index),
    ...Array.from({ length: 6 }, (_, index) => nodeJ * 6 + index),
  ];
  for (let index = 0; index < 12; index += 1) global[map[index]] += local[index];
}

function submatrix(source, rows, columns) {
  return rows.map((row) => columns.map((column) => source[row][column]));
}

function subvector(source, rows) {
  return rows.map((row) => source[row]);
}

function solveDense(A, rhs) {
  const n = A.length;
  const M = A.map((row, index) => [...row, rhs[index]]);
  for (let pivot = 0; pivot < n; pivot += 1) {
    let best = pivot;
    for (let row = pivot + 1; row < n; row += 1) {
      if (Math.abs(M[row][pivot]) > Math.abs(M[best][pivot])) best = row;
    }
    if (!(Math.abs(M[best][pivot]) > 1e-18)) throw new Error('REDUCER_CONDENSATION_INTERNAL_MATRIX_SINGULAR');
    [M[pivot], M[best]] = [M[best], M[pivot]];
    const divisor = M[pivot][pivot];
    for (let column = pivot; column <= n; column += 1) M[pivot][column] /= divisor;
    for (let row = 0; row < n; row += 1) {
      if (row === pivot) continue;
      const factor = M[row][pivot];
      if (factor === 0) continue;
      for (let column = pivot; column <= n; column += 1) M[row][column] -= factor * M[pivot][column];
    }
  }
  return M.map((row) => row[n]);
}

function multiply(A, B) {
  const rows = A.length;
  const inner = A[0].length;
  const columns = B[0].length;
  const result = matrix(rows, 0);
  result.forEach((row) => { row.length = columns; row.fill(0); });
  for (let i = 0; i < rows; i += 1) {
    for (let k = 0; k < inner; k += 1) {
      const value = A[i][k];
      for (let j = 0; j < columns; j += 1) result[i][j] += value * B[k][j];
    }
  }
  return result;
}

function multiplyVector(A, x) {
  return A.map((row) => row.reduce((sum, value, index) => sum + value * x[index], 0));
}

function subtractMatrix(A, B) {
  return A.map((row, i) => row.map((value, j) => cleanNumber(value - B[i][j])));
}

function solveColumns(A, B) {
  const columns = B[0].length;
  const solved = matrix(A.length, 0);
  solved.forEach((row) => { row.length = columns; row.fill(0); });
  for (let column = 0; column < columns; column += 1) {
    const x = solveDense(A, B.map((row) => row[column]));
    for (let row = 0; row < A.length; row += 1) solved[row][column] = x[row];
  }
  return solved;
}

function flattenSymmetric(A) {
  const n = A.length;
  const values = [];
  for (let row = 0; row < n; row += 1) {
    for (let column = 0; column < n; column += 1) {
      values.push(cleanNumber((A[row][column] + A[column][row]) / 2));
    }
  }
  return values;
}

function condense(K, loads) {
  const boundary = [...Array.from({ length: 6 }, (_, index) => index), ...Array.from({ length: 6 }, (_, index) => 60 + index)];
  const internal = Array.from({ length: 54 }, (_, index) => 6 + index);
  const Kbb = submatrix(K, boundary, boundary);
  const Kbi = submatrix(K, boundary, internal);
  const Kib = submatrix(K, internal, boundary);
  const Kii = submatrix(K, internal, internal);
  const X = solveColumns(Kii, Kib);
  const condensedK = subtractMatrix(Kbb, multiply(Kbi, X));
  const condensedLoads = {};
  for (const [name, full] of Object.entries(loads)) {
    const fb = subvector(full, boundary);
    const fi = subvector(full, internal);
    const yi = solveDense(Kii, fi);
    const correction = multiplyVector(Kbi, yi);
    condensedLoads[name] = fb.map((value, index) => cleanNumber(value - correction[index]));
  }
  return { stiffness: flattenSymmetric(condensedK), loads: condensedLoads };
}

/**
 * Compile a ten-cylinder reducer and statically condense its nine internal
 * stations to the original two-node interface.
 *
 * SOURCE: Hexagon CAESAR II Users Guide, Reducer: ten successively changing
 * pipe cylinders. Each cylinder uses the same retained CAESAR pipe-beam
 * transverse-shear formulation as a straight pipe span (shear coefficient 2,
 * represented by kappa=0.5 in the LFEA Timoshenko kernel). The midpoint
 * section sampling rule remains explicitly provisional because the public
 * reducer documentation does not publish the exact representative station.
 */
export function compileTenCylinderReducerAuthority(request) {
  const accepted = requireReducerCondensationRequest(request);
  const segmentLength = accepted.length / REDUCER_SEGMENT_COUNT;
  const globalSize = (REDUCER_SEGMENT_COUNT + 1) * 6;
  const K = matrix(globalSize, 0);
  const gravityFull = vector(globalSize);
  const thermalFull = vector(globalSize);
  const directionNorm = Math.hypot(...accepted.gravity.directionLocal);
  const direction = accepted.gravity.directionLocal.map((value) => value / directionNorm);
  const temperatureDifference = accepted.thermal.operatingTemperature - accepted.thermal.installationTemperature;
  const axialStrain = accepted.material.thermalExpansionCoefficient * temperatureDifference;
  const segments = [];
  let totalWeight = 0;
  let firstWeightMoment = 0;

  for (let index = 0; index < REDUCER_SEGMENT_COUNT; index += 1) {
    // SOURCE STATUS: candidate midpoint sampling pending CAESAR parity extraction.
    const fraction = (index + 0.5) / REDUCER_SEGMENT_COUNT;
    const section = annulus(
      interpolate(accepted.fromSection.outerDiameter, accepted.toSection.outerDiameter, fraction),
      interpolate(accepted.fromSection.wallThickness, accepted.toSection.wallThickness, fraction),
    );
    const stiffnessResult = frameLocalStiffness({
      elasticModulus: accepted.material.elasticModulus,
      shearModulus: accepted.material.shearModulus,
      area: section.area,
      secondMomentY: section.secondMomentY,
      secondMomentZ: section.secondMomentZ,
      polarMoment: section.polarMoment,
      length: segmentLength,
      shearDeformation: true,
      shearCorrectionFactorY: CAESAR_PIPE_SHEAR_CORRECTION_FACTOR,
      shearCorrectionFactorZ: CAESAR_PIPE_SHEAR_CORRECTION_FACTOR,
    });
    addElementMatrix(K, stiffnessResult.matrix, index, index + 1);

    const thermal = thermalInitialStrainVector({
      elasticModulus: accepted.material.elasticModulus,
      area: section.area,
      axialStrain,
    });
    addElementVector(thermalFull, thermal, index, index + 1);

    const metalLineWeight = accepted.material.massDensity * section.area * accepted.gravity.acceleration;
    const fluidArea = Math.PI * section.innerDiameter ** 2 / 4;
    const fluidLineWeight = accepted.gravity.fluidDensity * fluidArea * accepted.gravity.acceleration;
    const insulatedOd = section.outerDiameter + 2 * accepted.gravity.insulationThickness;
    const insulationArea = Math.PI * (insulatedOd ** 2 - section.outerDiameter ** 2) / 4;
    const insulationLineWeight = accepted.gravity.insulationDensity * insulationArea * accepted.gravity.acceleration;
    const lineWeight = accepted.gravity.enabled ? metalLineWeight + fluidLineWeight + insulationLineWeight : 0;
    const intensity = {
      fx: direction[0] * lineWeight,
      fy: direction[1] * lineWeight,
      fz: direction[2] * lineWeight,
    };
    const gravity = distributedLoadLocalVector({
      primitive: {
        kind: 'DISTRIBUTED_LOAD',
        basis: 'ELEMENT_LOCAL',
        startIntensity: intensity,
        endIntensity: intensity,
      },
      axes: null,
      length: segmentLength,
      phiXY: stiffnessResult.phiXY,
      phiXZ: stiffnessResult.phiXZ,
    });
    addElementVector(gravityFull, gravity, index, index + 1);
    const segmentWeight = lineWeight * segmentLength;
    const midpoint = (index + 0.5) * segmentLength;
    totalWeight += segmentWeight;
    firstWeightMoment += segmentWeight * midpoint;
    segments.push({
      index,
      midpointFraction: cleanNumber(fraction),
      startFraction: index / REDUCER_SEGMENT_COUNT,
      endFraction: (index + 1) / REDUCER_SEGMENT_COUNT,
      length: cleanNumber(segmentLength),
      section,
      shearFlexibility: {
        phiXY: cleanNumber(stiffnessResult.phiXY),
        phiXZ: cleanNumber(stiffnessResult.phiXZ),
        correctionFactorY: CAESAR_PIPE_SHEAR_CORRECTION_FACTOR,
        correctionFactorZ: CAESAR_PIPE_SHEAR_CORRECTION_FACTOR,
      },
      lineWeights: {
        metal: cleanNumber(accepted.gravity.enabled ? metalLineWeight : 0),
        fluid: cleanNumber(accepted.gravity.enabled ? fluidLineWeight : 0),
        insulation: cleanNumber(accepted.gravity.enabled ? insulationLineWeight : 0),
        total: cleanNumber(lineWeight),
      },
    });
  }

  const condensed = condense(K, { gravity: gravityFull, thermal: thermalFull });
  return sealReducerCondensationAuthority({
    schema: REDUCER_CONDENSATION_AUTHORITY_SCHEMA,
    reducerId: accepted.reducerId,
    inputSemanticHash: accepted.semanticHash,
    sourceIdentity: {
      standard: 'CAESAR_II_REDUCER',
      edition: 'HEXAGON_USERS_GUIDE_VERSION_12_14',
      ruleId: 'TEN_SUCCESSIVELY_CHANGING_PIPE_CYLINDERS_WITH_CAESAR_PIPE_SHEAR',
      sourceRevision: accepted.sourceEvidence.sourceRevision,
      sourceSemanticHash: accepted.sourceEvidence.sourceSemanticHash,
    },
    parityStatus: 'CANDIDATE_PENDING_SECTION_SAMPLING_VERIFICATION',
    samplingRule: accepted.samplingRule,
    axisRule: 'CALLER_DECLARED_ELEMENT_AXIS',
    geometry: {
      length: accepted.length,
      fromSection: { ...accepted.fromSection },
      toSection: { ...accepted.toSection },
      segmentCount: accepted.segmentCount,
    },
    segments,
    condensed: {
      localStiffness: condensed.stiffness,
      gravityLocalVector: condensed.loads.gravity,
      thermalInitialStrainLocalVector: condensed.loads.thermal,
    },
    gravity: {
      totalWeight: cleanNumber(totalWeight),
      centroidFromEnd: totalWeight === 0 ? cleanNumber(accepted.length / 2) : cleanNumber(firstWeightMoment / totalWeight),
      firstMomentFromEnd: cleanNumber(firstWeightMoment),
      rule: 'TEN_CYLINDER_PHYSICAL_WEIGHT',
    },
    thermal: {
      temperatureDifference: cleanNumber(temperatureDifference),
      axialStrain: cleanNumber(axialStrain),
      rule: 'TEN_CYLINDER_THERMAL_STRAIN',
    },
    structuralParticipation: {
      publicBoundaryNodeCount: 2,
      condensedInternalStationCount: 9,
      publicBoundaryDofCount: 12,
      cylinderBeamFormulation: 'PIPE_FRAME3D_TIMOSHENKO_V1',
      shearCorrectionFactorY: CAESAR_PIPE_SHEAR_CORRECTION_FACTOR,
      shearCorrectionFactorZ: CAESAR_PIPE_SHEAR_CORRECTION_FACTOR,
      shearSource: CAESAR_PIPE_SHEAR_SOURCE,
      stressSectionRule: 'CODE_SPECIFIC_REDUCER_NOT_CONDENSED_EQUIVALENT_SECTION',
    },
    limitations: [
      'The public Hexagon documentation confirms ten successively changing pipe cylinders but not the exact section sampling position.',
      'MIDPOINT_LINEAR_INTERPOLATION_CANDIDATE_V1 remains a controlled candidate and not a byte-for-byte CAESAR section-sampling parity claim.',
      'Each cylinder uses the retained CAESAR pipe shear coefficient 2 (LFEA kappa=0.5); this is not a reducer-specific fitted coefficient.',
      'Eccentricity is represented by the caller-declared element axis; this authority varies section properties along that axis.',
    ],
    semanticHash: '',
  });
}

/**
 * UNQUALIFIED RESEARCH ONLY: evaluate the algebraic axial-pressure initial
 * strain of ten midpoint-sampled straight cylinders using the existing
 * closed-end prismatic pipe convention. This is NOT a claim that a tapered
 * reducer's sloping interior pressure surface or cap forces are represented
 * correctly by ten independent closed-end cylinders.
 *
 * IMPORTANT: this deliberately has no link to
 * augmentFrameElementReducer(), production profiles, or solver preflight.
 * That path must keep rejecting pressurized candidates until separate source
 * and CAESAR II qualification. The research can demonstrate mathematical
 * self-consistency, NOT engineering authority.
 */
export function compileTenCylinderAxialPressureHypothesis(request, pressureState) {
  const accepted = requireReducerCondensationRequest(request);
  if (!pressureState || typeof pressureState !== 'object'
    || Array.isArray(pressureState)
    || Object.keys(pressureState).sort().join(',') !== 'poissonRatio,pressurePa') {
    throw new TypeError('REDUCER_PRESSURE_RESEARCH_EXACT_STATE_REQUIRED');
  }
  const { pressurePa, poissonRatio } = pressureState;
  if (typeof pressurePa !== 'number' || !Number.isFinite(pressurePa)
    || typeof poissonRatio !== 'number' || !Number.isFinite(poissonRatio)
    || !(poissonRatio > -1 && poissonRatio < 0.5)) {
    throw new TypeError('REDUCER_PRESSURE_RESEARCH_PHYSICAL_STATE_INVALID');
  }

  // Reuse the same midpoint cylinders and frozen section evidence as the
  // candidate reducer. Reassemble only inside this research function: no
  // candidate pressure vector is stored on a production frame element.
  const candidate = compileTenCylinderReducerAuthority(accepted);
  const size = (REDUCER_SEGMENT_COUNT + 1) * 6;
  const stiffness = matrix(size, 0);
  const fullPressureLoad = vector(size);
  let freeAxialExtension = 0;
  const cylinders = [];
  for (const segment of candidate.segments) {
    const { section, index, length } = segment;
    const stiffnessSegment = frameLocalStiffness({
      elasticModulus: accepted.material.elasticModulus,
      shearModulus: accepted.material.shearModulus,
      area: section.area,
      secondMomentY: section.secondMomentY,
      secondMomentZ: section.secondMomentZ,
      polarMoment: section.polarMoment,
      length,
      shearDeformation: true,
      shearCorrectionFactorY: CAESAR_PIPE_SHEAR_CORRECTION_FACTOR,
      shearCorrectionFactorZ: CAESAR_PIPE_SHEAR_CORRECTION_FACTOR,
    });
    addElementMatrix(stiffness, stiffnessSegment.matrix, index, index + 1);
    const strain = closedEndPressureAxialStrain({
      pressure: pressurePa,
      outerDiameter: section.outerDiameter,
      innerDiameter: section.innerDiameter,
      poissonRatio,
      elasticModulus: accepted.material.elasticModulus,
      elementId: accepted.reducerId,
    });
    const segmentLoad = thermalInitialStrainVector({
      elasticModulus: accepted.material.elasticModulus,
      area: section.area,
      axialStrain: strain,
    });
    addElementVector(fullPressureLoad, segmentLoad, index, index + 1);
    freeAxialExtension += length * strain;
    cylinders.push({
      cylinderIndex: index,
      localMidpointFraction: segment.midpointFraction,
      areaM2: section.area,
      innerDiameterM: section.innerDiameter,
      pressureAxialStrain: cleanNumber(strain),
      initialStrainEquivalentAxialForceN: cleanNumber(segmentLoad[6]),
      impliedFreeAxialExtensionM: cleanNumber(length * strain),
    });
  }
  const condensed = condense(stiffness, { pressure: fullPressureLoad });
  const pressureVector = condensed.loads.pressure;
  const axialStiffness = condensed.stiffness[0];
  const expectedPressureForce = axialStiffness * freeAxialExtension;
  const mismatch = Math.max(
    Math.abs(pressureVector[0] + expectedPressureForce),
    Math.abs(pressureVector[6] - expectedPressureForce),
    ...pressureVector.filter((_, i) => i !== 0 && i !== 6).map(Math.abs),
  );
  const normalization = Math.max(1, Math.abs(expectedPressureForce));
  if (mismatch / normalization > 2e-8) {
    throw new Error('REDUCER_PRESSURE_RESEARCH_FREE_EXTENSION_INCONSISTENT');
  }
  const stiffnessMismatch = Math.max(...condensed.stiffness.map((value, index) =>
    Math.abs(value - candidate.condensed.localStiffness[index])
    / Math.max(1, Math.abs(value), Math.abs(candidate.condensed.localStiffness[index]))));
  if (stiffnessMismatch > 2e-8) {
    throw new Error('REDUCER_PRESSURE_RESEARCH_SOURCE_STIFFNESS_CHANGED');
  }
  return Object.freeze({
    schema: 'fea-linear-reducer-axial-pressure-research/v1',
    status: 'MATHEMATICALLY_CONSISTENT_NOT_TAPER_PRESSURE_AUTHORIZED',
    ruleId: 'UNQUALIFIED_CYLINDERWISE_CLOSED_END_AXIAL_STRAIN_V1',
    reducerId: accepted.reducerId,
    reducerRequestSemanticHash: accepted.semanticHash,
    underlyingCandidateAuthoritySemanticHash: candidate.semanticHash,
    pressurePa,
    poissonRatio,
    samplingRule: accepted.samplingRule,
    midpointCylinderCount: cylinders.length,
    cylinders: Object.freeze(cylinders),
    condensedPressureInitialStrainLocalVector: Object.freeze(pressureVector),
    equivalentFreeAxialExtensionM: cleanNumber(freeAxialExtension),
    equivalentCondensedAxialStiffnessNPerM: cleanNumber(axialStiffness),
    algebraicAxialLoadN: cleanNumber(expectedPressureForce),
    freeExpansionConsistencyRelativeResidual: cleanNumber(mismatch / normalization),
    stiffnessReassemblyRelativeResidual: cleanNumber(stiffnessMismatch),
    slopedInnerWallPressureForceModelled: false,
    sourceTaperPressureAuthorityEstablished: false,
    productionUseAuthorized: false,
    globalCaesarIIParityQualified: false,
    limitations: Object.freeze([
      'Straight-cylinder closed-end axial pressure strain is applied independently to each taper sampling station. The actual conical inner-wall axial pressure traction is not resolved.',
      'No external CAESAR II pressure-on-taper rule or boundary end-cap treatment establishes engineering authority for this candidate.',
      'Midpoint section sampling, reducer gravity ownership, source pressure boundary conditions, and whole-model parity remain open.',
      'The production ten-cylinder path retains a fail-closed guard for nonzero axial-pressure strain.',
    ]),
  });
}
