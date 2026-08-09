/**
 * Compile and solve a linear CAESAR ACCDB model without loading InputXML.
 * The ACCDB supplies geometry, sections, stiffness, mass, pressure, temperature,
 * restraints, rigid bodies, reducers and bends; the benchmark profile supplies
 * only authorities absent from the database, such as thermal expansion.
 */
import {
  FRAME_LOCAL_AXIS_PROFILE,
  conditionGeometry,
  discretiseBend,
  resolveFrameLocalAxes,
} from '../centerline-beam-fea/index.js';
import {
  COMPONENT_GEOMETRY_SCHEMA,
  FACTOR_CALCULATION_REQUEST_SCHEMA,
  calculateB31Factors,
} from '../linear-fea-b31-factor-calculator/index.js';
import {
  compileFrameElement,
  condenseEndConditions,
  distributedLoadLocalVector,
  frameOffsetMatrix,
  frameTransformationMatrix,
  sealFrameElementProfile,
  thermalInitialStrainVector,
  transformDisplacementToLocal,
  transformLoadToGlobal,
  transformStiffnessToGlobal,
} from '../linear-fea-frame-element/index.js';
import {
  LINEAR_FEA_MATERIAL_RESOLUTION_PROFILE,
  resolveLinearFeaMaterialState,
  sealMaterialTable,
} from '../linear-fea-material/index.js';
import {
  compilePhysicalLoadCase,
  modelReferenceFromCompilation,
  sealLoadCaseProfile,
} from '../linear-fea-load-case/index.js';
import {
  compileMechanicalModel,
  sealMechanicalModelCompilerProfile,
} from '../linear-fea-model-compiler/index.js';
import {
  classifyBranchLegs,
  compilePipingComponent,
  deriveMec21BendPressureFreeState,
  deriveB31JDirectionalBranchEndModifiers,
  sealPipingComponentProfile,
} from '../linear-fea-piping-components/index.js';
import {
  REDUCER_CONDENSATION_REQUEST_SCHEMA,
  REDUCER_SAMPLING_RULE,
  REDUCER_SEGMENT_COUNT,
  compileTenCylinderReducerAuthority,
  sealReducerCondensationRequest,
} from '../linear-fea-reducer-condensation/index.js';
import {
  RIGID_ELEMENT_REQUEST_SCHEMA,
  compileCaesarRigidElementAuthority,
  rigidElementBourdonPressureEffect,
  sealRigidElementRequest,
} from '../linear-fea-rigid-element/index.js';
import {
  PIPE_SECTION_FORMULATION_ID,
  PIPE_SECTION_PROFILE,
  PIPE_SECTION_REQUEST_SCHEMA,
  computePipeSectionRequestSemanticHash,
  resolvePipeSection,
} from '../linear-fea-section/index.js';
import {
  compileSolverExecution,
  requireElementContribution,
  sealSolverProfile,
} from '../linear-fea-solver/index.js';
import {
  gatherJointDisplacement12,
  recoverElementEndAction,
} from '../linear-fea-result-recovery/index.js';
import { resolveCaesarBendPressureStiffeningPressurePa } from './caesar-bend-pressure-authority.js';
import { semanticHash } from '../shared-piping-model/canonical-json.js';
import { deepFreeze } from '../shared-piping-model/immutable.js';

const PROFILE_SOURCE = 'CAESAR_ACCDB_LINEAR_SOLVE_PROFILE_V1';
const FACTOR_PROFILE_ID = 'B31_3_2022_B31J_2017';
const MOMENT_DIRECTION_MAPPING = Object.freeze({ inPlaneField: 'my', outOfPlaneField: 'mz' });
const DOFS = Object.freeze(['UX', 'UY', 'UZ', 'RX', 'RY', 'RZ']);
const FORCE_COMPONENTS = Object.freeze(['FX', 'FY', 'FZ']);
const MOMENT_COMPONENTS = Object.freeze(['MX', 'MY', 'MZ']);
const MM_TO_M = 0.001;
const KPA_TO_PA = 1000;
const KG_PER_CM3_TO_KG_PER_M3 = 1e6;
const CELSIUS_TO_KELVIN = 273.15;
const POSITION_TOLERANCE_M = 1e-7;
const CAESAR_WELDING_TEE_TYPE = 3;

/** Solve every selected physical case and emit normalized comparison rows plus mechanics evidence. */
export function solveCaesarAccdbLinearBenchmark(benchmarkPackage) {
  requireBenchmarkPackage(benchmarkPackage);
  const solveProfile = benchmarkPackage.profile.linearSolve;
  if (solveProfile === null) throw new TypeError('The ACCDB profile does not declare linearSolve authorities.');
  const cases = {};
  const caseEvidence = {};
  for (const caseRecord of benchmarkPackage.cases) {
    const solved = solveCase(benchmarkPackage, caseRecord, solveProfile);
    cases[caseRecord.caseId] = {
      executionSemanticHash: solved.execution.semanticHash,
      executionEvidenceHash: solved.execution.evidenceHash,
      rows: solved.rows,
    };
    caseEvidence[caseRecord.caseId] = solved.evidence;
  }
  return deepFreeze({
    schema: 'lfea-accdb-benchmark-actual/v1',
    sourceAccdbSha256: benchmarkPackage.source.sha256,
    cases,
    mechanics: {
      schema: 'lfea-accdb-linear-solve-evidence/v1',
      sourceModelSemanticHash: benchmarkPackage.model.semanticHash,
      profile: solveProfile,
      cases: caseEvidence,
      limitations: [
        'Restraints are linearized as bilateral fixed DOFs; friction and lift-off are excluded as requested.',
        'The explicit Bourdon job mode is supplied by the benchmark profile because CAESAR existing-job settings are absent from ACCDB exports.',
        'Translation-and-rotation mode applies closed-end axial pressure strain to non-bend spans and one MEC-21 equation (2.25) bend-level free field sampled at all discretized bend stations.',
        'Bend stiffness uses the qualified B31.3/B31J factor calculator and true tangent-to-tangent arc components.',
        'Reducer stiffness, gravity and thermal loads use the governed ten-cylinder midpoint-sampling candidate.',
        'Topology-qualified TYPE=3 welding tees use unreduced B31J directional end springs; branch legs connect at the run surface through a rigid offset.',
      ],
    },
  });
}

function solveCase(benchmarkPackage, caseRecord, solveProfile) {
  const caseMode = requireSupportedCase(caseRecord);
  const modelInput = benchmarkPackage.model;
  const sourceRows = sortedElements(modelInput.tables.INPUT_BASIC_ELEMENT_DATA.rows);
  const material = buildMaterial(sourceRows, caseMode, solveProfile, benchmarkPackage);
  const sectionRegistry = createSectionRegistry(benchmarkPackage);
  const sourceSections = new Map(sourceRows.map((row) => [
    String(row.ELEMENTID),
    sectionRegistry.resolve(Number(row.DIAMETER) * MM_TO_M, Number(row.WALL_THICK) * MM_TO_M),
  ]));
  const sourcePositions = buildSourcePositions(modelInput.tables.INPUT_NODAL_COORDINATES.rows);
  const bendDefinitions = buildBendDefinitions({
    benchmarkPackage,
    solveProfile,
    sourceRows,
    sourcePositions,
    sourceSections,
    material,
  });
  const teeJunctions = solveProfile.directionalB31JTeeFlexibility
    ? buildTeeJunctions({
        benchmarkPackage,
        sourceRows,
        sourcePositions,
        sourceSections,
        material,
      })
    : Object.freeze([]);
  const teeModifierBySourceElementId = mergeTeeModifiers(teeJunctions);
  const analysis = buildAnalysisElements({
    benchmarkPackage,
    caseMode,
    solveProfile,
    sourceRows,
    sourcePositions,
    sourceSections,
    sectionRegistry,
    material,
    bendDefinitions,
    teeModifierBySourceElementId,
  });
  const geometry = analysisGeometry(benchmarkPackage, analysis.positions, analysis.elements);
  const conditioned = conditionGeometry(geometry, [], conditioningProfile());
  const constraints = restraintConstraints(modelInput.tables.INPUT_RESTRAINTS.rows);
  const compilation = compileAnalysisModel({
    benchmarkPackage,
    material,
    sectionResolutions: sectionRegistry.values(),
    analysis,
    conditioned,
    constraints,
  });
  const loadCase = compileCaseDeclaration({ benchmarkPackage, caseRecord, compilation, solveProfile });
  const execution = compileSolverExecution({
    compilation,
    elementContributions: analysis.elements.map((entry) => entry.contribution),
    loadCase,
    solverProfile: solverProfile(),
  });
  if (execution.status === 'BLOCKED') {
    const error = new Error(
      `ACCDB linear solve ${caseRecord.caseId} was blocked by solver qualification: ${JSON.stringify(execution.diagnostics)}.`,
    );
    error.code = 'CAESAR_ACCDB_LINEAR_SOLVE_BLOCKED';
    error.execution = execution;
    throw error;
  }
  const recovered = recoverActions(execution, analysis.elements);
  return {
    execution,
    rows: resultRows({ benchmarkPackage, execution, recovered, analysis }),
    evidence: {
      formula: caseRecord.formula,
      thermalIncluded: caseMode.thermal,
      pressureIncluded: caseMode.pressure,
      executionStatus: execution.status,
      analysisNodeCount: analysis.positions.size,
      analysisElementCount: analysis.elements.length,
      sourceElementCount: sourceRows.length,
      bendPointerCount: bendDefinitions.length,
      bendPointers: bendDefinitions.map((entry) => entry.pointer),
      teeJunctionCount: teeJunctions.length,
      teeJunctions: teeJunctions.map((entry) => ({
        nodeId: entry.nodeId,
        incidentSourceElementIds: entry.incidentSourceElementIds,
        modifierSemanticHash: entry.modifiers.semanticHash,
        directionalFlexibilityFactors: entry.modifiers.directionalFlexibilityFactors,
        diameterReconciliation: entry.diameterReconciliation,
      })),
      rigidElementCount: analysis.elements.filter((entry) => entry.kind === 'RIGID').length,
      reducerElementCount: analysis.elements.filter((entry) => entry.kind === 'REDUCER').length,
      pressureElongationElementCount: analysis.elements.filter((entry) => entry.pressureAxialStrain !== 0).length,
      rotationalBourdonElementCount: analysis.elements
        .filter((entry) => entry.bourdonRotationRadians !== 0).length,
      gravityWeightN: analysis.elements.reduce((sum, entry) => sum + entry.gravityWeightN, 0),
      elementLedger: analysis.elements.map((entry) => ({
        elementId: entry.elementId,
        sourceElementId: entry.sourceElementId,
        nodeI: entry.nodeI,
        nodeJ: entry.nodeJ,
        kind: entry.kind,
        teeJunctionNodeId: entry.teeJunctionNodeId,
        pressureAxialStrain: entry.pressureAxialStrain,
        bourdonRotationRadians: entry.bourdonRotationRadians,
        bourdonFreeEndTranslationM: entry.bourdonFreeEndTranslationM,
        gravityWeightN: entry.gravityWeightN,
      })),
    },
  };
}

function buildAnalysisElements(input) {
  const positions = new Map([...input.sourcePositions].map(([id, point]) => [id, [...point]]));
  for (const definition of input.bendDefinitions) {
    definition.points.forEach((point, index) => {
      const nodeId = definition.nodeIds[index];
      const canMove = index === definition.points.length - 1;
      setAnalysisPosition(positions, nodeId, point, canMove);
    });
  }
  const bendByElement = new Map(input.bendDefinitions.map((entry) => [entry.sourceElementId, entry]));
  const rigidRows = new Map(input.benchmarkPackage.model.tables.INPUT_RIGIDS.rows
    .map((row) => [Number(row.RIGID_PTR), row]));
  const reducerRows = new Map(input.benchmarkPackage.model.tables.INPUT_REDUCERS.rows
    .map((row) => [Number(row.RED_PTR), row]));
  const elements = [];
  for (const row of input.sourceRows) {
    const sourceElementId = String(row.ELEMENTID);
    const teeModifier = input.teeModifierBySourceElementId.get(sourceElementId) ?? null;
    const bend = bendByElement.get(sourceElementId);
    if (bend) {
      appendBendElements(elements, positions, row, bend, teeModifier, input);
      continue;
    }
    const nodeI = String(row.FROM_NODE);
    const nodeJ = String(row.TO_NODE);
    const rigidPointer = Number(row.RIGID_PTR);
    const reducerPointer = Number(row.REDUCER_PTR);
    if (reducerPointer > 0 && input.solveProfile.reducerCondensation) {
      if (teeModifier !== null) {
        throw new TypeError(
          `ACCDB source element ${sourceElementId} cannot combine a condensed reducer and a tee end modifier.`,
        );
      }
      elements.push(buildReducerElement({
        ...input,
        row,
        nodeI,
        nodeJ,
        positions,
        declaration: requirePointer(reducerRows, reducerPointer, 'REDUCER'),
      }));
    } else if (rigidPointer > 0) {
      elements.push(buildRigidElement({
        ...input,
        row,
        nodeI,
        nodeJ,
        positions,
        declaration: requirePointer(rigidRows, rigidPointer, 'RIGID'),
        teeModifier,
      }));
    } else {
      elements.push(buildFrameElement({
        ...input,
        row,
        elementId: `ACCDB.E${sourceElementId}`,
        nodeI,
        nodeJ,
        positions,
        section: input.sourceSections.get(sourceElementId),
        kind: reducerPointer > 0 ? 'REDUCER_PRISMATIC' : 'FRAME',
        pressureLengthScale: 1,
        thermalLengthScale: 1,
        gravityLengthScale: 1,
        bourdonBendSegment: null,
        teeModifier,
      }));
    }
  }
  requireTeeModifierCoverage(elements, input.teeModifierBySourceElementId);
  return { positions, elements };
}

function appendBendElements(target, positions, row, bend, teeModifier, input) {
  const sourceElementId = String(row.ELEMENTID);
  const hasIncomingStraight = distance(
    input.sourcePositions.get(String(row.FROM_NODE)),
    bend.tangentStart,
  ) > POSITION_TOLERANCE_M;
  if (teeModifier !== null && (!hasIncomingStraight || teeModifier.junctionEnd !== 'I')) {
    throw new TypeError(
      `ACCDB bend source ${sourceElementId} can carry tee flexibility only at source I on a finite incoming straight.`,
    );
  }
  if (hasIncomingStraight) {
    target.push(buildFrameElement({
      ...input,
      row,
      elementId: `ACCDB.E${sourceElementId}.STRAIGHT`,
      nodeI: String(row.FROM_NODE),
      nodeJ: bend.nodeIds[0],
      positions,
      section: input.sourceSections.get(sourceElementId),
      kind: 'BEND_INCOMING_STRAIGHT',
      pressureLengthScale: 1,
      thermalLengthScale: 1,
      gravityLengthScale: 1,
      bourdonBendSegment: null,
      teeModifier,
    }));
  }
  const arcToChord = bend.component.geometry.arcLength / bend.component.geometry.chordChainLength;
  const bourdonMode = input.solveProfile.bourdonPressureEffects.mode;
  for (let index = 0; index < bend.component.elements.length; index += 1) {
    const componentEntry = bend.component.elements[index];
    target.push(buildFrameElement({
      ...input,
      row,
      elementId: componentEntry.elementId,
      nodeI: bend.nodeIds[index],
      nodeJ: bend.nodeIds[index + 1],
      positions,
      section: input.sourceSections.get(sourceElementId),
      kind: 'BEND_ARC',
      pressureLengthScale: bourdonMode === 'TRANSLATION_ONLY' ? arcToChord : 0,
      thermalLengthScale: arcToChord,
      gravityLengthScale: arcToChord,
      bourdonBendSegment: bourdonMode === 'TRANSLATION_AND_ROTATION'
        ? bend.bourdonSegments[index]
        : null,
      stiffnessFrame: componentEntry.frameElement,
      effectiveLocalStiffness: componentEntry.effectiveLocalStiffness,
      effectiveGlobalStiffness: componentEntry.effectiveGlobalStiffness,
      teeModifier: null,
    }));
  }
}

function buildFrameElement(input) {
  const sourceElementId = String(input.row.ELEMENTID);
  const teeModifier = input.teeModifier ?? null;
  const rigidOffsets = teeRigidOffsets(teeModifier);
  const referenceVector = teeModifier?.referenceVector ?? [0, 0, 1];
  const axesResult = resolveAxes(
    input.positions,
    input.nodeI,
    input.nodeJ,
    referenceVector,
    rigidOffsets,
  );
  const frame = input.stiffnessFrame ?? compileUnloadedFrame({
    elementId: input.elementId,
    axesResult,
    material: input.material,
    section: input.section,
  });
  const length = frame.geometry.length;
  const lineWeight = input.gravityLineWeight
    ?? physicalLineWeight(input.row, input.section, input.solveProfile.gravityAcceleration);
  const gravityLineWeight = lineWeight * input.gravityLengthScale;
  const baseEquivalentLocal = gravityVector(frame, gravityLineWeight);
  const thermalStrain = input.caseMode.thermal
    ? input.solveProfile.thermalExpansionCoefficientPerKelvin
      * (Number(input.row.TEMP_EXP_C1) + CELSIUS_TO_KELVIN
        - input.benchmarkPackage.model.installationTemperatureK)
      * input.thermalLengthScale
    : 0;
  const pressureStrain = input.caseMode.pressure
    && input.solveProfile.bourdonPressureEffects.mode !== 'DISABLED'
    ? (input.pressureAxialStrainOverride ?? (
        closedEndPressureAxialStrain(input.row, frame.material.elasticModulus)
        * input.pressureLengthScale))
    : 0;
  const axialInitialLocal = thermalInitialStrainVector({
    elasticModulus: frame.material.elasticModulus,
    area: frame.section.area,
    axialStrain: thermalStrain + pressureStrain,
  });
  const baseEffectiveLocalStiffness = input.effectiveLocalStiffness ?? frame.localStiffness;
  const bourdon = input.caseMode.pressure
    && input.solveProfile.bourdonPressureEffects.mode === 'TRANSLATION_AND_ROTATION'
    && input.bourdonBendSegment !== null
    ? buildBourdonBendInitialLoad({
        row: input.row,
        section: input.section,
        frame,
        effectiveLocalStiffness: baseEffectiveLocalStiffness,
        segment: input.bourdonBendSegment,
      })
    : null;
  const baseInitialLocal = bourdon === null
    ? axialInitialLocal
    : add(axialInitialLocal, bourdon.initialLocal);
  const condensed = condenseTeeEndConditions(
    baseEffectiveLocalStiffness,
    baseEquivalentLocal,
    baseInitialLocal,
    teeModifier,
  );
  const effectiveLocalStiffness = condensed.matrix;
  const equivalentLocal = condensed.equivalentLocal;
  const initialLocal = condensed.initialLocal;
  let effectiveGlobalStiffness = transformStiffnessToGlobal(
    effectiveLocalStiffness,
    frame.transformation.matrix,
  );
  let equivalentGlobal = transformLoadToGlobal(equivalentLocal, frame.transformation.matrix);
  let initialGlobal = transformLoadToGlobal(initialLocal, frame.transformation.matrix);
  if (rigidOffsets.I !== null || rigidOffsets.J !== null) {
    const offsetMatrix = frameOffsetMatrix(rigidOffsets);
    effectiveGlobalStiffness = transformStiffnessToGlobal(effectiveGlobalStiffness, offsetMatrix);
    equivalentGlobal = transformLoadToGlobal(equivalentGlobal, offsetMatrix);
    initialGlobal = transformLoadToGlobal(initialGlobal, offsetMatrix);
  }
  return analysisElement({
    elementId: input.elementId,
    sourceElementId,
    nodeI: input.nodeI,
    nodeJ: input.nodeJ,
    kind: input.kind,
    material: input.material,
    bindingSection: input.section,
    axesResult,
    frame,
    rigidOffsets,
    effectiveLocalStiffness,
    effectiveGlobalStiffness,
    equivalentLocal,
    equivalentGlobal,
    initialLocal,
    initialGlobal,
    pressureAxialStrain: pressureStrain,
    bourdonRotationRadians: bourdon?.rotationRadians ?? 0,
    bourdonFreeEndTranslationM: bourdon?.freeEndTranslationM ?? zero3(),
    gravityWeightN: gravityLineWeight * length,
    teeJunctionNodeId: teeModifier?.junctionNodeId ?? null,
  });
}

function buildRigidElement(input) {
  const sourceElementId = String(input.row.ELEMENTID);
  const length = distance(input.positions.get(input.nodeI), input.positions.get(input.nodeJ));
  const physicalSection = input.sourceSections.get(sourceElementId);
  const materialState = input.material.materialState;
  const authority = compileCaesarRigidElementAuthority(sealRigidElementRequest({
    schema: RIGID_ELEMENT_REQUEST_SCHEMA,
    rigidElementId: `ACCDB-RIGID-${Number(input.row.RIGID_PTR)}`,
    length,
    insideDiameter: physicalSection.dimensions.innerDiameter,
    enteredOutsideDiameter: physicalSection.dimensions.outerDiameter,
    pipeWallThickness: physicalSection.dimensions.wallThickness,
    enteredRigidWeight: Number(input.declaration.RIGID_WGT),
    fluidDensity: density(input.row.FLUID_DENSITY),
    insulationThickness: Number(input.row.INSUL_THICK) * MM_TO_M,
    insulationDensity: density(input.row.INSUL_DENSITY),
    refractoryWeight: 0,
    claddingWeight: 0,
    gravityAcceleration: input.solveProfile.gravityAcceleration,
    installationTemperature: input.benchmarkPackage.model.installationTemperatureK,
    operatingTemperature: Number(input.row.TEMP_EXP_C1) + CELSIUS_TO_KELVIN,
    material: {
      elasticModulus: materialState.elasticModulus,
      shearModulus: materialState.shearModulus,
      thermalExpansionCoefficient: input.solveProfile.thermalExpansionCoefficientPerKelvin,
    },
    sourceEvidence: sourceEvidence(`ACCDB:RIGID:${Number(input.row.RIGID_PTR)}`, input.benchmarkPackage.source.sha256),
    semanticHash: '',
  }));
  const pressureEffect = rigidElementBourdonPressureEffect(authority, {
    pressure: Number(input.row.PRESSURE1) * KPA_TO_PA,
    poissonRatio: Number(input.row.POISSONS),
  });
  const rigidSection = input.sectionRegistry.resolve(
    authority.stiffnessSection.outsideDiameter,
    authority.stiffnessSection.wallThickness,
  );
  return buildFrameElement({
    ...input,
    elementId: `ACCDB.E${sourceElementId}`,
    section: rigidSection,
    kind: 'RIGID',
    pressureLengthScale: 0,
    pressureAxialStrainOverride: pressureEffect.equivalentAxialStrain,
    thermalLengthScale: 1,
    gravityLengthScale: 1,
    gravityLineWeight: authority.gravity.totalLineWeight,
    bourdonBendSegment: null,
  });
}

function buildReducerElement(input) {
  const sourceElementId = String(input.row.ELEMENTID);
  const fromSection = input.sourceSections.get(sourceElementId);
  const toSection = reducerToSection(input);
  const axesResult = resolveAxes(
    input.positions,
    input.nodeI,
    input.nodeJ,
    [0, 0, 1],
    { I: null, J: null },
  );
  const length = axesResult.elementDirection.length;
  const gravityDirectionLocal = projectToLocal(axesResult.axes, [0, -1, 0]);
  const materialState = input.material.materialState;
  const request = sealReducerCondensationRequest({
    schema: REDUCER_CONDENSATION_REQUEST_SCHEMA,
    reducerId: `ACCDB-REDUCER-${Number(input.row.REDUCER_PTR)}`,
    length,
    fromSection: sectionDimensions(fromSection),
    toSection: sectionDimensions(toSection),
    segmentCount: REDUCER_SEGMENT_COUNT,
    samplingRule: REDUCER_SAMPLING_RULE,
    material: {
      elasticModulus: materialState.elasticModulus,
      shearModulus: materialState.shearModulus,
      massDensity: materialState.massDensity,
      thermalExpansionCoefficient: input.solveProfile.thermalExpansionCoefficientPerKelvin,
    },
    gravity: {
      enabled: true,
      acceleration: input.solveProfile.gravityAcceleration,
      directionLocal: gravityDirectionLocal,
      fluidDensity: density(input.row.FLUID_DENSITY),
      insulationThickness: Number(input.row.INSUL_THICK) * MM_TO_M,
      insulationDensity: density(input.row.INSUL_DENSITY),
    },
    thermal: {
      installationTemperature: input.benchmarkPackage.model.installationTemperatureK,
      operatingTemperature: input.caseMode.thermal
        ? Number(input.row.TEMP_EXP_C1) + CELSIUS_TO_KELVIN
        : input.benchmarkPackage.model.installationTemperatureK,
    },
    sourceEvidence: sourceEvidence(`ACCDB:REDUCER:${Number(input.row.REDUCER_PTR)}`, input.benchmarkPackage.source.sha256),
    semanticHash: '',
  });
  const authority = compileTenCylinderReducerAuthority(request);
  const transformation = frameTransformationMatrix(axesResult.axes);
  const equivalentLocal = [...authority.condensed.gravityLocalVector];
  const initialLocal = input.caseMode.thermal
    ? [...authority.condensed.thermalInitialStrainLocalVector]
    : zero12();
  const equivalentGlobal = transformLoadToGlobal(equivalentLocal, transformation);
  const initialGlobal = transformLoadToGlobal(initialLocal, transformation);
  const effectiveGlobalStiffness = transformStiffnessToGlobal(authority.condensed.localStiffness, transformation);
  const frame = pseudoFrame({
    transformation,
    localAxes: axesResult.axes,
    length,
    equivalentLocal,
    equivalentGlobal,
    initialLocal,
    initialGlobal,
  });
  return analysisElement({
    elementId: `ACCDB.E${sourceElementId}`,
    sourceElementId,
    nodeI: input.nodeI,
    nodeJ: input.nodeJ,
    kind: 'REDUCER',
    material: input.material,
    bindingSection: fromSection,
    axesResult,
    frame,
    effectiveLocalStiffness: authority.condensed.localStiffness,
    effectiveGlobalStiffness,
    equivalentLocal,
    equivalentGlobal,
    initialLocal,
    initialGlobal,
    pressureAxialStrain: 0,
    bourdonRotationRadians: 0,
    bourdonFreeEndTranslationM: zero3(),
    gravityWeightN: authority.gravity.totalWeight,
  });
}

function analysisElement(input) {
  const recoveryFrame = {
    ...input.frame,
    rigidOffsets: input.rigidOffsets ?? input.frame.rigidOffsets,
    equivalentLoadVector: { local: input.equivalentLocal, global: input.equivalentGlobal },
    initialStrainLoadVector: { local: input.initialLocal, global: input.initialGlobal },
  };
  return Object.freeze({
    elementId: input.elementId,
    sourceElementId: input.sourceElementId,
    nodeI: input.nodeI,
    nodeJ: input.nodeJ,
    kind: input.kind,
    teeJunctionNodeId: input.teeJunctionNodeId ?? null,
    material: input.material,
    bindingSection: input.bindingSection,
    axesResult: input.axesResult,
    recoveryFrame,
    effectiveLocalStiffness: input.effectiveLocalStiffness,
    contribution: requireElementContribution({
      elementId: input.elementId,
      globalStiffness: input.effectiveGlobalStiffness,
      equivalentLoadGlobal: input.equivalentGlobal,
      initialStrainLoadGlobal: input.initialGlobal,
    }),
    pressureAxialStrain: input.pressureAxialStrain,
    bourdonRotationRadians: input.bourdonRotationRadians ?? 0,
    bourdonFreeEndTranslationM: input.bourdonFreeEndTranslationM ?? zero3(),
    gravityWeightN: input.gravityWeightN,
  });
}

/**
 * Discover physical welding tees from ACCDB declarations plus three-leg
 * topology, calculate unreduced B31J factors, and derive modifiers for the
 * existing incident source elements. TYPE=3 declarations without three
 * incident legs are not treated as physical tee junctions.
 */
function buildTeeJunctions(input) {
  const declaredNodeIds = [...new Set(input.benchmarkPackage.model.tables.INPUT_SIFTEES.rows
    .filter((row) => Number(row.TYPE) === CAESAR_WELDING_TEE_TYPE && Number(row.NODE) > 0)
    .map((row) => String(row.NODE)))].sort(compareText);
  const profile = componentProfile();
  const junctions = [];
  for (const nodeId of declaredNodeIds) {
    const incident = input.sourceRows.filter((row) =>
      String(row.FROM_NODE) === nodeId || String(row.TO_NODE) === nodeId);
    if (incident.length !== 3) continue;
    const junctionPosition = input.sourcePositions.get(nodeId);
    if (!junctionPosition) throw new TypeError(`ACCDB welding tee node ${nodeId} has no coordinate.`);
    const topologyLegs = incident.map((row) => teeLeg(row, nodeId, input));
    const classification = classifyBranchLegs(
      topologyLegs,
      junctionPosition,
      profile.runCollinearityTolerance,
    );
    const roleById = new Map(classification.legs.map((entry) => [entry.legId, entry.role]));
    const runRows = incident.filter((row) => roleById.get(String(row.ELEMENTID)) === 'RUN');
    const branchRow = incident.find((row) => roleById.get(String(row.ELEMENTID)) === 'BRANCH');
    if (runRows.length !== 2 || !branchRow) {
      throw new TypeError(`ACCDB welding tee node ${nodeId} did not resolve two run legs and one branch leg.`);
    }
    const runSection = input.sourceSections.get(String(runRows[0].ELEMENTID));
    const branchSection = input.sourceSections.get(String(branchRow.ELEMENTID));
    const factorGeometry = teeFactorGeometry(
      runSection,
      branchSection,
      input.benchmarkPackage.profile.linearSolve.teeNominalDiameterRelativeTolerance,
      nodeId,
    );
    const factorResult = calculateB31Factors({
      schema: FACTOR_CALCULATION_REQUEST_SCHEMA,
      calculationId: `ACCDB-TEE-${nodeId}-FACTORS`,
      componentId: `ACCDB-TEE-${nodeId}`,
      editionProfileId: FACTOR_PROFILE_ID,
      componentType: 'WELDING_TEE',
      geometry: {
        schema: COMPONENT_GEOMETRY_SCHEMA,
        componentType: 'WELDING_TEE',
        lengthUnit: 'm',
        runOuterDiameter: factorGeometry.runOuterDiameter,
        runWallThickness: runSection.dimensions.wallThickness,
        branchOuterDiameter: factorGeometry.branchOuterDiameter,
        branchWallThickness: branchSection.dimensions.wallThickness,
        fittingQuality: 'UNVERIFIED',
        sourceEvidence: {
          sourceId: `ACCDB:INPUT_SIFTEES:TYPE3:NODE:${nodeId}`,
          sourceRevision: input.benchmarkPackage.source.sha256,
        },
      },
      momentDirectionMapping: MOMENT_DIRECTION_MAPPING,
      semanticHash: '',
    });
    if (factorResult.status !== 'QUALIFIED') {
      throw new TypeError(
        `ACCDB welding tee node ${nodeId} did not produce qualified B31J factors: `
        + `${JSON.stringify(factorResult.applicability)}.`,
      );
    }
    const modifiers = deriveB31JDirectionalBranchEndModifiers({
      componentId: `ACCDB-TEE-${nodeId}`,
      factorResult,
      junctionPosition,
      legs: topologyLegs,
      runCollinearityTolerance: profile.runCollinearityTolerance,
    });
    junctions.push(Object.freeze({
      nodeId,
      incidentSourceElementIds: Object.freeze(
        incident.map((row) => String(row.ELEMENTID)).sort(compareText),
      ),
      factorResult,
      modifiers,
      diameterReconciliation: factorGeometry.reconciliation,
    }));
  }
  return Object.freeze(junctions.sort((left, right) => compareText(left.nodeId, right.nodeId)));
}

function teeFactorGeometry(runSection, branchSection, relativeTolerance, nodeId) {
  const runOuterDiameter = runSection.dimensions.outerDiameter;
  const declaredBranchOuterDiameter = branchSection.dimensions.outerDiameter;
  if (declaredBranchOuterDiameter <= runOuterDiameter) {
    return {
      runOuterDiameter,
      branchOuterDiameter: declaredBranchOuterDiameter,
      reconciliation: null,
    };
  }
  const relativeDifference = (declaredBranchOuterDiameter - runOuterDiameter) / runOuterDiameter;
  if (relativeDifference > relativeTolerance) {
    throw new TypeError(
      `ACCDB welding tee node ${nodeId} branch OD exceeds run OD by ${relativeDifference}; `
      + `the declared nominal-diameter tolerance is ${relativeTolerance}.`,
    );
  }
  return {
    runOuterDiameter,
    branchOuterDiameter: runOuterDiameter,
    reconciliation: Object.freeze({
      rule: 'ACCDB_EQUAL_NOMINAL_DIAMETER_WITHIN_DECLARED_RELATIVE_TOLERANCE_V1',
      declaredBranchOuterDiameter,
      factorBranchOuterDiameter: runOuterDiameter,
      runOuterDiameter,
      relativeDifference,
      relativeTolerance,
    }),
  };
}

function teeLeg(row, nodeId, input) {
  const sourceElementId = String(row.ELEMENTID);
  const atI = String(row.FROM_NODE) === nodeId;
  const otherNodeId = String(atI ? row.TO_NODE : row.FROM_NODE);
  const endPoint = input.sourcePositions.get(otherNodeId);
  if (!endPoint) {
    throw new TypeError(
      `ACCDB welding tee node ${nodeId} incident element ${sourceElementId} lacks endpoint ${otherNodeId}.`,
    );
  }
  return {
    legId: sourceElementId,
    nodeId: otherNodeId,
    junctionEnd: atI ? 'I' : 'J',
    endPoint,
    material: input.material,
    section: input.sourceSections.get(sourceElementId),
  };
}

function mergeTeeModifiers(junctions) {
  const result = new Map();
  for (const junction of junctions) {
    for (const modifier of junction.modifiers.modifiers) {
      if (result.has(modifier.legId)) {
        throw new TypeError(
          `ACCDB source element ${modifier.legId} is incident to more than one tee; `
          + 'two-end directional frame reconciliation is not qualified.',
        );
      }
      result.set(modifier.legId, Object.freeze({
        junctionNodeId: junction.nodeId,
        junctionEnd: modifier.junctionEnd,
        referenceVector: modifier.referenceVector,
        rotationalSprings: modifier.rotationalSprings,
        rigidOffset: modifier.rigidOffset,
        factorValues: modifier.factorValues,
        role: modifier.role,
      }));
    }
  }
  return result;
}

function requireTeeModifierCoverage(elements, modifierBySourceElementId) {
  for (const sourceElementId of modifierBySourceElementId.keys()) {
    const carriers = elements.filter((entry) =>
      entry.sourceElementId === sourceElementId && entry.teeJunctionNodeId !== null);
    if (carriers.length !== 1) {
      throw new TypeError(
        `ACCDB tee-modified source element ${sourceElementId} must have exactly one analysis carrier; `
        + `found ${carriers.length}.`,
      );
    }
    if (carriers[0].kind === 'BEND_ARC') {
      throw new TypeError(`ACCDB tee modifier for source element ${sourceElementId} leaked into a bend arc.`);
    }
  }
}

function buildBendDefinitions(input) {
  const bendRows = new Map(input.benchmarkPackage.model.tables.INPUT_BENDS.rows
    .map((row) => [Number(row.BEND_PTR), row]));
  const definitions = [];
  for (const row of input.sourceRows) {
    const pointer = Number(row.BEND_PTR);
    if (!(pointer > 0)) continue;
    const declaration = requirePointer(bendRows, pointer, 'BEND');
    const outgoing = input.sourceRows.filter((candidate) => String(candidate.FROM_NODE) === String(row.TO_NODE));
    if (outgoing.length !== 1) throw new TypeError(`BEND_PTR ${pointer} requires one outgoing element; found ${outgoing.length}.`);
    const start = input.sourcePositions.get(String(row.FROM_NODE));
    const intersection = input.sourcePositions.get(String(row.TO_NODE));
    const outletEnd = input.sourcePositions.get(String(outgoing[0].TO_NODE));
    const incomingDirection = unit(subtract(intersection, start), `BEND_PTR ${pointer} incoming`);
    const outgoingDirection = unit(subtract(outletEnd, intersection), `BEND_PTR ${pointer} outgoing`);
    const bendAngle = Math.acos(clamp(dot(incomingDirection, outgoingDirection), -1, 1));
    const radius = Number(declaration.RADIUS) * MM_TO_M;
    if (!(bendAngle > 0 && bendAngle < Math.PI) || !(radius > 0)) {
      throw new TypeError(`BEND_PTR ${pointer} has invalid angle or radius.`);
    }
    const tangentLength = radius * Math.tan(bendAngle / 2);
    if (!(tangentLength < distance(start, intersection)) || !(tangentLength < distance(intersection, outletEnd))) {
      throw new TypeError(`BEND_PTR ${pointer} tangent length overruns an adjacent span.`);
    }
    const tangentStart = subtract(intersection, scale(incomingDirection, tangentLength));
    const tangentEnd = add(intersection, scale(outgoingDirection, tangentLength));
    const section = input.sourceSections.get(String(row.ELEMENTID));
    const factorResult = calculateB31Factors({
      schema: FACTOR_CALCULATION_REQUEST_SCHEMA,
      calculationId: `ACCDB-BEND-${pointer}-FACTORS`,
      componentId: `ACCDB-BEND-${pointer}`,
      editionProfileId: FACTOR_PROFILE_ID,
      componentType: 'BEND',
      geometry: {
        schema: COMPONENT_GEOMETRY_SCHEMA,
        componentType: 'BEND',
        lengthUnit: 'm',
        outerDiameter: section.dimensions.outerDiameter,
        wallThickness: section.dimensions.wallThickness,
        bendRadius: radius,
        pressure: resolveCaesarBendPressureStiffeningPressurePa(row),
        elasticModulus: input.material.materialState.elasticModulus,
        bendAngleDegrees: bendAngle * 180 / Math.PI,
        smooth90FlexibilityCorrection: input.solveProfile.b31jSmooth90FlexibilityCorrection.enabled,
        sourceEvidence: { sourceId: `ACCDB:BEND:${pointer}`, sourceRevision: input.benchmarkPackage.source.sha256 },
      },
      momentDirectionMapping: MOMENT_DIRECTION_MAPPING,
      semanticHash: '',
    });
    if (factorResult.status !== 'QUALIFIED' || !factorResult.componentFactorSet) {
      throw new TypeError(`BEND_PTR ${pointer} did not produce a qualified B31 factor set.`);
    }
    const component = compilePipingComponent({
      componentId: `ACCDB-BEND-${pointer}`,
      componentType: 'BEND',
      profile: componentProfile(),
      arc: { tangentStart, tangentEnd, incomingDirection, declaredRadius: radius },
      material: input.material,
      section,
      frameElementProfile: frameProfile(),
      localAxisProfile: FRAME_LOCAL_AXIS_PROFILE,
      referenceVector: null,
      factorSet: factorResult.componentFactorSet,
    });
    const chain = discretiseBend(
      asPoint(tangentStart),
      asPoint(tangentEnd),
      asPoint(component.geometry.centre),
      component.subdivision.elementCount,
    );
    const points = chain.points.map((point) => [point.x, point.y, point.z]);
    const bourdonSegments = buildBourdonSegments(
      points,
      component.geometry.centre,
      radius,
      pointer,
      incomingDirection,
      bendAngle,
    );
    const middleIndex = component.subdivision.elementCount / 2;
    if (!Number.isInteger(middleIndex)) throw new TypeError(`BEND_PTR ${pointer} lacks an exact mid-arc station.`);
    const nodeIds = chain.points.map((_point, index) => {
      if (index === 0 && validStationNode(declaration.NODE2)) return String(declaration.NODE2);
      if (index === middleIndex && validStationNode(declaration.NODE1)) return String(declaration.NODE1);
      if (index === component.subdivision.elementCount) return String(row.TO_NODE);
      return `ACCDB.BEND${pointer}.N${index}`;
    });
    definitions.push(Object.freeze({
      pointer,
      sourceElementId: String(row.ELEMENTID),
      tangentStart,
      tangentEnd,
      component,
      points,
      nodeIds,
      bourdonSegments,
    }));
  }
  const pointers = definitions.map((entry) => entry.pointer).sort((a, b) => a - b);
  const declared = [...bendRows.keys()].sort((a, b) => a - b);
  if (pointers.length !== declared.length || pointers.some((value, index) => value !== declared[index])) {
    throw new TypeError(`BEND_PTR solve coverage mismatch: solved [${pointers}], declared [${declared}].`);
  }
  return definitions.sort((left, right) => left.pointer - right.pointer);
}

/**
 * Build one cumulative MEC-21 bend coordinate field over the numerical arc.
 * Each chord retains its own frame axes for stiffness, but its pressure free
 * state is sampled from the same physical bend initial point. This prevents
 * the pressure endpoint from changing when the stiffness mesh is refined.
 */
function buildBourdonSegments(points, centrePoint, bendRadius, pointer, incomingDirection, totalBendAngle) {
  const centre = [...centrePoint];
  const referenceAAxis = unit(incomingDirection, `BEND_PTR ${pointer} reference a-axis`);
  const referenceCAxis = unit(subtract(centre, points[0]), `BEND_PTR ${pointer} reference c-axis`);
  const referenceBAxis = unit(
    cross(referenceCAxis, referenceAAxis),
    `BEND_PTR ${pointer} reference b-axis`,
  );
  const referenceAxes = Object.freeze({
    aAxis: Object.freeze([...referenceAAxis]),
    bAxis: Object.freeze([...referenceBAxis]),
    cAxis: Object.freeze([...referenceCAxis]),
  });
  const segments = [];
  let cumulativeAngle = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const pointI = points[index];
    const pointJ = points[index + 1];
    const cAxis = unit(subtract(centre, pointI), `BEND_PTR ${pointer} segment ${index} c-axis`);
    const nextCAxis = unit(subtract(centre, pointJ), `BEND_PTR ${pointer} segment ${index} next c-axis`);
    const chordDirection = unit(subtract(pointJ, pointI), `BEND_PTR ${pointer} segment ${index} chord`);
    const tangentProjection = subtract(chordDirection, scale(cAxis, dot(chordDirection, cAxis)));
    const aAxis = unit(tangentProjection, `BEND_PTR ${pointer} segment ${index} a-axis`);
    const bAxis = unit(cross(cAxis, aAxis), `BEND_PTR ${pointer} segment ${index} b-axis`);
    const bendAngle = Math.acos(clamp(dot(cAxis, nextCAxis), -1, 1));
    if (!(bendAngle > 0)) throw new TypeError(`BEND_PTR ${pointer} segment ${index} has zero arc angle.`);
    const startAngle = cumulativeAngle;
    const rawEndAngle = cumulativeAngle + bendAngle;
    const endAngle = index === points.length - 2 ? totalBendAngle : rawEndAngle;
    cumulativeAngle = endAngle;
    segments.push(Object.freeze({
      aAxis,
      bAxis,
      cAxis,
      bendAngle,
      bendRadius,
      startAngle,
      endAngle,
      referenceAxes,
    }));
  }
  const angularError = Math.abs(cumulativeAngle - totalBendAngle);
  if (angularError > 1e-10 * Math.max(1, totalBendAngle)) {
    throw new TypeError(
      `BEND_PTR ${pointer} discretized angle ${cumulativeAngle} does not close declared angle ${totalBendAngle}.`,
    );
  }
  return Object.freeze(segments);
}

function compileAnalysisModel(input) {
  return compileMechanicalModel({
    modelIdentity: `${input.benchmarkPackage.benchmarkId}-${input.material.materialState.materialStateId}`,
    modelRevision: 1,
    sourceSemanticHash: input.benchmarkPackage.model.semanticHash,
    conditionedTopology: input.conditioned,
    nodeBindings: input.conditioned.geometry.nodes.map((node) => ({
      nodeId: String(node.id),
      conditionedNodeId: `CN-${node.id}`,
      topologyNodeId: String(node.id),
    })),
    elementBindings: input.analysis.elements.map((entry) => ({
      elementId: entry.elementId,
      conditionedSegmentId: entry.elementId,
      topologySegmentId: entry.elementId,
      materialStateId: entry.material.materialState.materialStateId,
      sectionStateId: entry.bindingSection.sectionState.sectionStateId,
      formulationId: 'PIPE_FRAME3D_LINEAR_V1',
      localAxisEvidenceIdentity: `AXIS-${entry.elementId}`,
      sourceComponentId: `ACCDB-SOURCE-E${entry.sourceElementId}`,
    })),
    materialResolutions: [input.material],
    sectionResolutions: input.sectionResolutions,
    localAxisResults: input.analysis.elements.map((entry) => ({
      evidenceIdentity: `AXIS-${entry.elementId}`,
      result: entry.axesResult,
    })),
    localAxisProfile: FRAME_LOCAL_AXIS_PROFILE,
    constraintDeclarations: input.constraints,
    profile: compilerProfile(),
  });
}

function compileCaseDeclaration(input) {
  return compilePhysicalLoadCase({
    loadCaseId: `ACCDB-${input.caseRecord.caseId}`,
    loadCaseClass: 'MIXED_PHYSICAL',
    presentation: { label: input.caseRecord.caseId, description: input.caseRecord.formula },
    modelReference: modelReferenceFromCompilation(input.compilation),
    primitives: [{
      schema: 'fea-linear-load-primitive/v1',
      primitiveId: `ACCDB-${input.caseRecord.caseId}-GRAVITY`,
      kind: 'GRAVITY',
      direction: { x: 0, y: -1, z: 0 },
      basis: 'GLOBAL',
      includedMassSources: ['PIPE_WALL', 'CONTENTS', 'INSULATION', 'COMPONENT'],
      sourceEvidence: sourceEvidence('ACCDB:WEIGHT', input.benchmarkPackage.source.sha256),
    }],
    profile: loadCaseProfile(input.solveProfile.gravityAcceleration),
  });
}

function recoverActions(execution, elements) {
  const displacementIndex = new Map(execution.displacement
    .map((entry) => [`${entry.nodeId}:${entry.dof}`, entry.value]));
  const actions = elements.map((entry) => {
    const jointDisplacement12 = gatherJointDisplacement12(displacementIndex, entry.nodeI, entry.nodeJ);
    const action = recoverElementEndAction({
      frameElementRecord: entry.recoveryFrame,
      effectiveLocalStiffness: entry.effectiveLocalStiffness,
      jointDisplacement12,
    });
    return { entry, action };
  });
  const incident = new Map();
  for (const recovered of actions) {
    addIncident(incident, recovered.entry.nodeI, recovered.action.qGlobal.slice(0, 6));
    addIncident(incident, recovered.entry.nodeJ, recovered.action.qGlobal.slice(6, 12));
  }
  return { actions, incident };
}

function resultRows(input) {
  const sourceNodeIds = new Set(input.benchmarkPackage.model.tables.INPUT_BASIC_ELEMENT_DATA.rows
    .flatMap((row) => [String(row.FROM_NODE), String(row.TO_NODE)]));
  const displacementIndex = new Map(input.execution.displacement
    .map((entry) => [`${entry.nodeId}:${entry.dof}`, entry.value]));
  const reactionIndex = new Map(input.execution.reactions
    .map((entry) => [`${entry.nodeId}:${entry.dof}`, entry.value]));
  const restraintNodeIds = [...new Set(input.benchmarkPackage.model.tables.INPUT_RESTRAINTS.rows
    .map((row) => String(row.NODE_NUM)))].sort(compareText);
  const rows = [];
  for (const nodeId of [...sourceNodeIds].sort(compareText)) {
    for (const dof of DOFS) {
      rows.push(nodeResultRow(
        nodeId,
        dof.startsWith('U') ? 'DISPLACEMENT' : 'ROTATION',
        dof,
        displacementIndex.get(`${nodeId}:${dof}`) ?? 0,
        dof.startsWith('U') ? 'm' : 'rad',
      ));
    }
  }
  for (const nodeId of restraintNodeIds) {
    for (const dof of DOFS) {
      rows.push(nodeResultRow(
        nodeId,
        dof.startsWith('U') ? 'FORCE' : 'MOMENT',
        dof,
        reactionIndex.get(`${nodeId}:${dof}`) ?? 0,
        dof.startsWith('U') ? 'N' : 'N*m',
      ));
    }
  }
  for (const nodeId of [...sourceNodeIds].sort(compareText)) {
    const vector = input.recovered.incident.get(nodeId) ?? zero6();
    DOFS.forEach((dof, index) => rows.push(nodeResultRow(
      nodeId,
      dof.startsWith('U') ? 'INCIDENT_GLOBAL_FORCE' : 'INCIDENT_GLOBAL_MOMENT',
      dof,
      vector[index],
      dof.startsWith('U') ? 'N' : 'N*m',
    )));
  }
  for (const recovered of input.recovered.actions) appendGlobalActionRows(rows, recovered);
  appendSourceGlobalActionRows(
    rows,
    input.benchmarkPackage.model.tables.INPUT_BASIC_ELEMENT_DATA.rows,
    input.recovered.actions,
  );
  return rows;
}

function appendGlobalActionRows(rows, recovered) {
  for (const [label, offset] of [['FROM', 0], ['TO', 6]]) {
    FORCE_COMPONENTS.forEach((component, index) => rows.push({
      entityKind: 'ELEMENT',
      entityId: recovered.entry.elementId,
      quantity: `GLOBAL_END_FORCE_${label}`,
      component,
      value: clean(recovered.action.qGlobal[offset + index]),
      unit: 'N',
    }));
    MOMENT_COMPONENTS.forEach((component, index) => rows.push({
      entityKind: 'ELEMENT',
      entityId: recovered.entry.elementId,
      quantity: `GLOBAL_END_MOMENT_${label}`,
      component,
      value: clean(recovered.action.qGlobal[offset + index + 3]),
      unit: 'N*m',
    }));
  }
}

function appendSourceGlobalActionRows(rows, sourceRows, recoveredActions) {
  for (const sourceRow of sourceRows) {
    const sourceElementId = String(sourceRow.ELEMENTID);
    const descendants = recoveredActions.filter((entry) =>
      entry.entry.sourceElementId === sourceElementId);
    if (descendants.length === 0) {
      throw new TypeError(`ACCDB source element ${sourceElementId} has no recovered analysis descendants.`);
    }
    appendGlobalVectorRows(
      rows,
      sourceResultElementId(sourceRow),
      'FROM',
      descendants[0].action.qGlobal.slice(0, 6),
    );
    appendGlobalVectorRows(
      rows,
      sourceResultElementId(sourceRow),
      'TO',
      descendants.at(-1).action.qGlobal.slice(6, 12),
    );
  }
}

function appendGlobalVectorRows(rows, entityId, label, vector) {
  FORCE_COMPONENTS.forEach((component, index) => rows.push({
    entityKind: 'ELEMENT',
    entityId,
    quantity: `GLOBAL_END_FORCE_${label}`,
    component,
    value: clean(vector[index]),
    unit: 'N',
  }));
  MOMENT_COMPONENTS.forEach((component, index) => rows.push({
    entityKind: 'ELEMENT',
    entityId,
    quantity: `GLOBAL_END_MOMENT_${label}`,
    component,
    value: clean(vector[index + 3]),
    unit: 'N*m',
  }));
}

function sourceResultElementId(row) {
  return `INPUT_ELEMENT:${String(row.ELEMENTID)}|${String(row.FROM_NODE)}->${String(row.TO_NODE)}`
    + `|${String(row.ELEMENT_NAME ?? '').trim()}`;
}

function buildMaterial(sourceRows, caseMode, solveProfile, benchmarkPackage) {
  const elasticValues = uniqueNumbers(sourceRows.map((row) => Number(caseMode.thermal ? row.HOT_MOD1 : row.MODULUS)));
  const poissonValues = uniqueNumbers(sourceRows.map((row) => Number(row.POISSONS)));
  const densityValues = uniqueNumbers(sourceRows.map((row) => density(row.PIPE_DENSITY)));
  if (elasticValues.length !== 1 || poissonValues.length !== 1 || densityValues.length !== 1) {
    throw new TypeError('The current ACCDB linear solve requires one material state per selected case.');
  }
  const evaluationTemperature = caseMode.thermal
    ? Math.max(...sourceRows.map((row) => Number(row.TEMP_EXP_C1) + CELSIUS_TO_KELVIN))
    : benchmarkPackage.model.installationTemperatureK;
  const elasticModulus = elasticValues[0] * KPA_TO_PA;
  const poissonRatio = poissonValues[0];
  const point = {
    absoluteTemperature: evaluationTemperature,
    elasticModulus,
    shearModulus: elasticModulus / (2 * (1 + poissonRatio)),
    poissonRatio,
    massDensity: densityValues[0],
    thermalExpansionCoefficient: solveProfile.thermalExpansionCoefficientPerKelvin,
  };
  const table = sealMaterialTable({
    schema: 'fea-linear-material-table/v1',
    materialId: `ACCDB-MATERIAL-${Number(sourceRows[0].MATERIAL_NUM)}`,
    sourceEvidence: sourceEvidence('ACCDB:INPUT_BASIC_ELEMENT_DATA:MATERIAL', benchmarkPackage.source.sha256),
    points: [point],
    semanticHash: '',
  });
  return resolveLinearFeaMaterialState({
    table,
    request: {
      materialStateId: `ACCDB-MAT-${caseMode.thermal ? 'HOT1' : 'AMBIENT'}`,
      materialId: table.materialId,
      evaluationTemperature,
    },
    profile: LINEAR_FEA_MATERIAL_RESOLUTION_PROFILE,
  });
}

function createSectionRegistry(benchmarkPackage) {
  const byKey = new Map();
  return {
    resolve(outerDiameter, wallThickness) {
      if (!(outerDiameter > 0) || !(wallThickness > 0) || !(outerDiameter > 2 * wallThickness)) {
        throw new TypeError(`Invalid ACCDB pipe section OD=${outerDiameter}, wall=${wallThickness}.`);
      }
      const key = `${outerDiameter}:${wallThickness}`;
      if (!byKey.has(key)) {
        const base = {
          schema: PIPE_SECTION_REQUEST_SCHEMA,
          sectionStateId: `ACCDB-SEC-${byKey.size + 1}`,
          formulationId: PIPE_SECTION_FORMULATION_ID,
          outerDiameter,
          wallThickness,
          sourceEvidence: sourceEvidence('ACCDB:PIPE_SECTION', `${benchmarkPackage.source.sha256}:${key}`),
        };
        byKey.set(key, resolvePipeSection({
          request: { ...base, semanticHash: computePipeSectionRequestSemanticHash(base) },
          profile: PIPE_SECTION_PROFILE,
        }));
      }
      return byKey.get(key);
    },
    values() { return [...byKey.values()]; },
  };
}

function compileUnloadedFrame(input) {
  return compileFrameElement({
    elementId: input.elementId,
    material: input.material,
    section: input.section,
    localAxes: { result: input.axesResult, profile: FRAME_LOCAL_AXIS_PROFILE },
    profile: frameProfile(),
    distributedLoads: [],
    temperature: null,
    releases: [],
    endSprings: [],
    rigidOffsets: null,
  });
}

function condenseTeeEndConditions(localStiffness, equivalentLocal, initialLocal, teeModifier) {
  if (teeModifier === null) {
    return {
      matrix: localStiffness,
      equivalentLocal,
      initialLocal,
    };
  }
  const entries = teeModifier.rotationalSprings
    .map((spring) => ({
      index: elementDofIndex(spring.end, spring.dof),
      stiffness: spring.stiffness,
    }))
    .sort((left, right) => left.index - right.index);
  const condensed = condenseEndConditions(
    localStiffness,
    [equivalentLocal, initialLocal],
    entries,
    frameProfile().releaseSingularityTolerance.value,
  );
  return {
    matrix: condensed.matrix,
    equivalentLocal: condensed.vectors[0],
    initialLocal: condensed.vectors[1],
  };
}

function teeRigidOffsets(teeModifier) {
  if (teeModifier === null || teeModifier.rigidOffset === null) return { I: null, J: null };
  return teeModifier.junctionEnd === 'I'
    ? { I: [...teeModifier.rigidOffset], J: null }
    : { I: null, J: [...teeModifier.rigidOffset] };
}

function elementDofIndex(end, dof) {
  const dofIndex = DOFS.indexOf(dof);
  if (!['I', 'J'].includes(end) || dofIndex < 0) {
    throw new TypeError(`Invalid tee end spring target ${String(end)}:${String(dof)}.`);
  }
  return (end === 'I' ? 0 : 6) + dofIndex;
}

function pseudoFrame(input) {
  return {
    geometry: { length: input.length },
    localAxes: { axes: input.localAxes },
    transformation: { matrix: input.transformation },
    rigidOffsets: { I: null, J: null },
    equivalentLoadVector: { local: input.equivalentLocal, global: input.equivalentGlobal },
    initialStrainLoadVector: { local: input.initialLocal, global: input.initialGlobal },
  };
}

function analysisGeometry(benchmarkPackage, positions, elements) {
  return {
    schemaVersion: 'canonical-geometry-v1',
    nodes: [...positions].map(([id, point]) => ({
      id,
      x: point[0],
      y: point[1],
      z: point[2],
      restraint: 'FREE',
      meta: {},
    })),
    segments: elements.map((entry) => ({
      id: entry.elementId,
      startNodeId: entry.nodeI,
      endNodeId: entry.nodeJ,
      type: 'PIPE',
      sourceComponentUid: `ACCDB-SOURCE-E${entry.sourceElementId}`,
      length: distance(positions.get(entry.nodeI), positions.get(entry.nodeJ)),
      meta: { sourceElementId: entry.sourceElementId, analysisKind: entry.kind },
    })),
    source: `ACCDB:${benchmarkPackage.source.sha256}`,
    unit: 'm',
    diagnostics: [],
    summary: { nodeCount: positions.size, segmentCount: elements.length },
  };
}

function buildSourcePositions(rows) {
  const positions = new Map();
  for (const row of rows) {
    setSourcePosition(positions, row.FROM_NODE, [row.FROM_NODE_X, row.FROM_NODE_Y, row.FROM_NODE_Z]);
    setSourcePosition(positions, row.TO_NODE, [row.TO_NODE_X, row.TO_NODE_Y, row.TO_NODE_Z]);
  }
  return positions;
}

function setSourcePosition(positions, nodeId, millimetres) {
  const id = String(nodeId);
  const point = millimetres.map((value) => Number(value) * MM_TO_M);
  const prior = positions.get(id);
  if (prior && distance(prior, point) > POSITION_TOLERANCE_M) {
    throw new TypeError(`ACCDB node ${id} has inconsistent coordinates.`);
  }
  positions.set(id, point);
}

function setAnalysisPosition(positions, nodeId, point, canMove) {
  const id = String(nodeId);
  const prior = positions.get(id);
  if (prior && !canMove && distance(prior, point) > POSITION_TOLERANCE_M) {
    throw new TypeError(`Bend station node ${id} conflicts with an existing ACCDB coordinate.`);
  }
  positions.set(id, [...point]);
}

function restraintConstraints(rows) {
  const constraints = new Map();
  for (const row of rows) {
    const type = Number(row.RES_TYPEID);
    const nodeId = String(row.NODE_NUM);
    const dofs = type === 1 ? [...DOFS] : [dominantTranslationDof(row)];
    for (const dof of dofs) {
      const key = `${nodeId}:${dof}`;
      constraints.set(key, {
        declarationId: `ACCDB-C-${nodeId}-${dof}`,
        kind: 'NODAL_RESTRAINT',
        nodeId,
        dof,
        behavior: 'FIXED',
      });
    }
  }
  return [...constraints.values()].sort((left, right) => compareText(left.declarationId, right.declarationId));
}

function dominantTranslationDof(row) {
  const values = [Number(row.XCOSINE), Number(row.YCOSINE), Number(row.ZCOSINE)].map(Math.abs);
  const maximum = Math.max(...values);
  if (!(maximum > 0)) throw new TypeError(`Restraint at node ${row.NODE_NUM} has no direction cosine.`);
  return ['UX', 'UY', 'UZ'][values.indexOf(maximum)];
}

function reducerToSection(input) {
  const declaredDiameter = Number(input.declaration.DIAMETER2) * MM_TO_M;
  let declaredThickness = Number(input.declaration.THICKNESS2) * MM_TO_M;
  if (!(declaredThickness > 0)) {
    const candidates = input.sourceRows.filter((row) =>
      String(row.FROM_NODE) === String(input.row.TO_NODE)
      && Math.abs(Number(row.DIAMETER) * MM_TO_M - declaredDiameter) <= POSITION_TOLERANCE_M);
    if (candidates.length !== 1) {
      throw new TypeError(`Reducer ${input.row.REDUCER_PTR} cannot resolve its outlet wall thickness.`);
    }
    declaredThickness = Number(candidates[0].WALL_THICK) * MM_TO_M;
  }
  return input.sectionRegistry.resolve(declaredDiameter, declaredThickness);
}

function physicalLineWeight(row, section, gravityAcceleration) {
  const pipe = density(row.PIPE_DENSITY) * section.sectionState.area * gravityAcceleration;
  const fluidArea = Math.PI * section.dimensions.innerDiameter ** 2 / 4;
  const contents = density(row.FLUID_DENSITY) * fluidArea * gravityAcceleration;
  const insulationThickness = Number(row.INSUL_THICK) * MM_TO_M;
  const insulatedOd = section.dimensions.outerDiameter + 2 * insulationThickness;
  const insulationArea = Math.PI * (insulatedOd ** 2 - section.dimensions.outerDiameter ** 2) / 4;
  const insulation = density(row.INSUL_DENSITY) * insulationArea * gravityAcceleration;
  return pipe + contents + insulation;
}

function gravityVector(frame, lineWeight) {
  return distributedLoadLocalVector({
    primitive: {
      kind: 'DISTRIBUTED_LOAD',
      basis: 'GLOBAL',
      startIntensity: { fx: 0, fy: -lineWeight, fz: 0 },
      endIntensity: { fx: 0, fy: -lineWeight, fz: 0 },
    },
    axes: frame.localAxes.axes,
    length: frame.geometry.length,
    phiXY: 0,
    phiXZ: 0,
  });
}

function closedEndPressureAxialStrain(row, elasticModulus) {
  const outerDiameter = Number(row.DIAMETER) * MM_TO_M;
  const wallThickness = Number(row.WALL_THICK) * MM_TO_M;
  const innerDiameter = outerDiameter - 2 * wallThickness;
  const pressure = Number(row.PRESSURE1) * KPA_TO_PA;
  const poissonRatio = Number(row.POISSONS);
  if (!(innerDiameter > 0) || !(outerDiameter > innerDiameter) || !(elasticModulus > 0)) {
    throw new TypeError(`Element ${row.ELEMENTID} cannot resolve closed-end pressure strain.`);
  }
  return (1 - 2 * poissonRatio) * pressure * innerDiameter ** 2
    / (elasticModulus * (outerDiameter ** 2 - innerDiameter ** 2));
}

/**
 * Convert one physical bend's cumulative MEC-21 free field into this chord's
 * initial load. Both chord-end generalized movements are sampled relative to
 * the physical bend initial point, transformed by the authoritative frame
 * relation d_local = T d_global, then multiplied by the stiffness actually
 * assembled for this chord. A free bend therefore has q = K(d-d0) = 0 and its
 * external free endpoint is independent of numerical subdivision.
 */
function buildBourdonBendInitialLoad(input) {
  const stateInput = {
    pressure: Number(input.row.PRESSURE1) * KPA_TO_PA,
    innerRadius: input.section.dimensions.innerDiameter / 2,
    bendRadius: input.segment.bendRadius,
    elasticModulus: input.frame.material.elasticModulus,
    secondMoment: input.section.sectionState.secondMomentY,
    poissonRatio: Number(input.row.POISSONS),
  };
  const startState = deriveMec21BendPressureFreeState({
    ...stateInput,
    bendAngle: input.segment.startAngle,
  });
  const endState = deriveMec21BendPressureFreeState({
    ...stateInput,
    bendAngle: input.segment.endAngle,
  });
  const startTranslationGlobal = abcVectorToGlobal(input.segment.referenceAxes, startState.translationAbc);
  const startRotationGlobal = abcVectorToGlobal(input.segment.referenceAxes, startState.rotationAbc);
  const endTranslationGlobal = abcVectorToGlobal(input.segment.referenceAxes, endState.translationAbc);
  const endRotationGlobal = abcVectorToGlobal(input.segment.referenceAxes, endState.rotationAbc);
  const freeDofGlobal = [
    ...startTranslationGlobal,
    ...startRotationGlobal,
    ...endTranslationGlobal,
    ...endRotationGlobal,
  ];
  const freeDofLocal = transformDisplacementToLocal(
    freeDofGlobal,
    input.frame.transformation.matrix,
  );
  return Object.freeze({
    initialLocal: matrixVector12(input.effectiveLocalStiffness, freeDofLocal),
    rotationRadians: endState.rotationAbc[1] - startState.rotationAbc[1],
    freeEndTranslationM: subtract(endTranslationGlobal, startTranslationGlobal),
  });
}

function abcVectorToGlobal(axes, vector) {
  return add(
    add(scale(axes.aAxis, vector[0]), scale(axes.bAxis, vector[1])),
    scale(axes.cAxis, vector[2]),
  );
}

function sectionDimensions(section) {
  return {
    outerDiameter: section.dimensions.outerDiameter,
    wallThickness: section.dimensions.wallThickness,
  };
}

function projectToLocal(axes, vector) {
  return [dot(axes.x, vector), dot(axes.y, vector), dot(axes.z, vector)];
}

function matrixVector12(matrix, vector) {
  if (!Array.isArray(matrix) || matrix.length !== 144 || !Array.isArray(vector) || vector.length !== 12) {
    throw new TypeError('Bourdon initial-load conversion requires a 12x12 matrix and 12-component vector.');
  }
  return new Array(12).fill(0).map((_unused, row) => {
    let sum = 0;
    for (let column = 0; column < 12; column += 1) sum += matrix[row * 12 + column] * vector[column];
    return clean(sum);
  });
}

function resolveAxes(positions, nodeI, nodeJ, referenceVector, rigidOffsets) {
  const pointI = positions.get(String(nodeI));
  const pointJ = positions.get(String(nodeJ));
  if (!pointI || !pointJ) throw new TypeError(`Analysis element ${nodeI}->${nodeJ} has a missing endpoint.`);
  return resolveFrameLocalAxes({
    nodeI: addOffset(pointI, rigidOffsets.I),
    nodeJ: addOffset(pointJ, rigidOffsets.J),
    referenceVector,
    profile: FRAME_LOCAL_AXIS_PROFILE,
  });
}

function addOffset(point, offset) {
  if (offset === null) return point;
  return point.map((value, index) => value + offset[index]);
}

function addIncident(map, nodeId, vector) {
  const id = String(nodeId);
  const prior = map.get(id) ?? zero6();
  map.set(id, prior.map((value, index) => value + vector[index]));
}

function nodeResultRow(entityId, quantity, component, value, unit) {
  return { entityKind: 'NODE', entityId, quantity, component, value: clean(value), unit };
}

function requireSupportedCase(caseRecord) {
  if (caseRecord.formula === 'W+P1') return Object.freeze({ thermal: false, pressure: true });
  if (caseRecord.formula === 'W+T1+P1') return Object.freeze({ thermal: true, pressure: true });
  throw new TypeError(`ACCDB linear solve does not implement physical formula ${caseRecord.formula}.`);
}

function sortedElements(rows) {
  return [...rows].sort((left, right) => Number(left.ELEMENTID) - Number(right.ELEMENTID));
}

function requirePointer(map, pointer, kind) {
  const value = map.get(Number(pointer));
  if (!value) throw new TypeError(`${kind}_PTR ${pointer} has no declaration.`);
  return value;
}

function requireBenchmarkPackage(value) {
  if (!value || value.schema !== 'caesar-accdb-benchmark-package/v1') {
    throw new TypeError('A canonical CAESAR ACCDB benchmark package is required.');
  }
}

function sourceEvidence(sourceId, sourceRevision) {
  const identity = { sourceId, sourceRevision };
  return { ...identity, sourceSemanticHash: semanticHash(identity) };
}

function conditioningProfile() {
  return {
    spanSeedingLimit: { value: 1e9, source: PROFILE_SOURCE },
    bendSeedingSegments: { value: 4, source: PROFILE_SOURCE },
    bendLengthErrorLimit: { value: 0.01, source: PROFILE_SOURCE },
  };
}

function compilerProfile() {
  return sealMechanicalModelCompilerProfile({
    schema: 'fea-linear-model-compiler-profile/v1',
    profileId: 'LINEAR-MODEL-COMPILER-R1',
    spanBindingRule: 'EXACTLY_ONE_BINDING_PER_SPAN_V1',
    zeroLengthLinkRule: 'ZERO_LENGTH_LINK_PROHIBITED_V1',
    constraintConflictRule: 'CONFLICTING_DEFINITION_BLOCKS_COMPILATION_V1',
    unrepresentableFeatureRule: 'UNREPRESENTABLE_FEATURE_BLOCKS_COMPILATION_V1',
    minimumElementLength: { value: 1e-8, source: PROFILE_SOURCE },
    spanDirectionTolerance: { value: 1e-9, source: PROFILE_SOURCE },
    semanticHash: '',
  });
}

function frameProfile() {
  return sealFrameElementProfile({
    schema: 'fea-linear-frame-element-profile/v1',
    profileId: 'LINEAR-FRAME-ELEMENT-R1',
    straightPipeFormulation: 'PIPE_FRAME3D_TIMOSHENKO_V1',
    shearDeformation: true,
    shearCorrectionFactorY: { value: 0.5, source: 'INTERGRAPH-CAESAR-II-CAUX-2015-FKX-SHEAR-COEFFICIENT-2' },
    shearCorrectionFactorZ: { value: 0.5, source: 'INTERGRAPH-CAESAR-II-CAUX-2015-FKX-SHEAR-COEFFICIENT-2' },
    releaseRule: 'STATIC_CONDENSATION_V1',
    thermalStrainApproximation: 'UNIFORM_TEMPERATURE_ALPHA_DELTA_T_V1',
    releaseSingularityTolerance: { value: 1e-12, source: PROFILE_SOURCE },
    semanticHash: '',
  });
}

function componentProfile() {
  return sealPipingComponentProfile({
    schema: 'fea-linear-piping-component-profile/v1',
    profileId: 'LINEAR-PIPING-COMPONENT-R1',
    bendFormulation: 'PIPE_BEND_CORRECTED_FRAME_V1',
    bendSubdivisionPurpose: 'STRESS_RECOVERY_V1',
    bendPressureStiffeningRule: 'BEND_PRESSURE_STIFFENING_DECLARED_FACTOR_V1',
    convergenceRequired: true,
    reducerRule: 'REDUCER_STEPPED_SECTION_V1',
    valveBodyRule: 'VALVE_RIGID_BODY_V1',
    weightLumpRule: 'FINITE_LENGTH_BODY_REQUIRED_V1',
    branchFlexibilityMethod: 'BRANCH_JUNCTION_ROTATIONAL_FLEXIBILITY_V1',
    branchClassificationRule: 'DIRECTION_VECTOR_TOPOLOGY_V1',
    supportOffsetRule: 'RIGID_OFFSET_KINEMATIC_V1',
    outsideApplicabilityRule: 'BLOCK',
    bendMaxAngleDegrees: { value: 5, source: PROFILE_SOURCE },
    bendMinimumElements: { value: 4, source: PROFILE_SOURCE },
    bendMinimumElementsBetweenStations: { value: 2, source: PROFILE_SOURCE },
    bendRadiusRelativeTolerance: { value: 1e-9, source: PROFILE_SOURCE },
    bendConvergenceRefinementFactor: { value: 4, source: PROFILE_SOURCE },
    convergenceRelativeTolerance: { value: 1e-2, source: PROFILE_SOURCE },
    flexibilityDoubleCountTolerance: { value: 1e-9, source: PROFILE_SOURCE },
    runCollinearityTolerance: { value: 1e-9, source: PROFILE_SOURCE },
    rigidBodyStiffnessMultiplier: { value: 1000, source: PROFILE_SOURCE },
    semanticHash: '',
  });
}

function loadCaseProfile(gravityAcceleration) {
  return sealLoadCaseProfile({
    schema: 'fea-linear-load-case-profile/v1',
    profileId: 'LINEAR-LOAD-CASE-R1',
    primitiveImmutabilityRule: 'PRIMITIVE_LOAD_CASE_IMMUTABLE_HASH_BOUND_V1',
    thermalStrainApproximation: 'UNIFORM_TEMPERATURE_ALPHA_DELTA_T_V1',
    combinationSemanticsRule: 'COMPONENT_SEMANTICS_VERIFIED_AGAINST_SOLVED_RESULTS_V1',
    codeCombinationRule: 'CODE_CATEGORY_COMBINATION_IS_NOT_A_SOLVER_LOAD_CASE_V1',
    gravitationalAcceleration: { value: gravityAcceleration, source: PROFILE_SOURCE },
    directionUnitTolerance: { value: 1e-12, source: PROFILE_SOURCE },
    semanticHash: '',
  });
}

function solverProfile() {
  return sealSolverProfile({
    schema: 'fea-linear-solver-profile/v1',
    profileId: 'LINEAR-SOLVER-R1',
    backend: 'FEA_SPARSE_DIRECT_CHOLESKY_LDLT_V1',
    scaling: 'DIAGONAL_ENERGY_SCALING_V1',
    momentReferenceRule: 'FIRST_CANONICAL_NODE_V1',
    normalizedResidualLimit: { value: 1e-6, source: 'M034-M035-BM4-CONDITIONING-STUDY' },
    normalizedResidualWarnLimit: { value: 1e-4, source: 'M034-M035-BM4-CONDITIONING-STUDY' },
    equilibriumRelativeLimit: { value: 3e-6, source: 'M034-M035-BM4-CONDITIONING-STUDY' },
    equilibriumAbsoluteForceFloor: { value: 1e-3, source: PROFILE_SOURCE },
    equilibriumAbsoluteMomentFloor: { value: 1e-3, source: PROFILE_SOURCE },
    energyBalanceLimit: { value: 1e-7, source: PROFILE_SOURCE },
    nearZeroPivotTolerance: { value: 1e-12, source: 'M027-BM2-CONDITIONING-STUDY' },
    conditionWarning: { value: 1e14, source: 'M027-BM2-CONDITIONING-STUDY' },
    conditionBlock: { value: 1e18, source: 'M027-BM2-CONDITIONING-STUDY' },
    semanticHash: '',
  });
}

function density(value) { return Number(value) * KG_PER_CM3_TO_KG_PER_M3; }
function validStationNode(value) { return Number.isFinite(Number(value)) && Number(value) > 0; }
function uniqueNumbers(values) { return [...new Set(values)]; }
function zero12() { return new Array(12).fill(0); }
function zero6() { return new Array(6).fill(0); }
function zero3() { return new Array(3).fill(0); }
function clean(value) { return Object.is(value, -0) || Math.abs(value) < 1e-12 ? 0 : value; }
function asPoint(value) { return { x: value[0], y: value[1], z: value[2] }; }
function add(left, right) { return left.map((value, index) => value + right[index]); }
function subtract(left, right) { return left.map((value, index) => value - right[index]); }
function scale(value, factor) { return value.map((entry) => entry * factor); }
function dot(left, right) { return left.reduce((sum, value, index) => sum + value * right[index], 0); }
function cross(left, right) {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
}
function distance(left, right) { return Math.hypot(...subtract(left, right)); }
function unit(value, field) {
  const length = Math.hypot(...value);
  if (!(length > 0)) throw new TypeError(`${field} direction is degenerate.`);
  return scale(value, 1 / length);
}
function clamp(value, minimum, maximum) { return Math.min(maximum, Math.max(minimum, value)); }
function compareText(left, right) { return String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0; }
