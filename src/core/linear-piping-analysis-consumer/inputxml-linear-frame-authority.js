import { FRAME_LOCAL_AXIS_PROFILE, resolveFrameLocalAxes } from '../centerline-beam-fea/index.js';
import { compileFrameElement } from '../linear-fea-frame-element/index.js';
import {
  augmentBranchRigidThermalFreeState,
  branchPhysicalEndpoint,
  branchRigidOffsets,
} from './inputxml-branch-element-augmentation.js';
import {
  position,
  requireAxisCustody,
} from './inputxml-linear-element-authority-support.js';

/** Compile one ordinary or B31J-modified frame span from the shared authority set. */
export function compileInputXmlFrameElementAuthority(input) {
  const modifier = input.branchModifier ?? null;
  const pointI = position(input.nodeI);
  const pointJ = position(input.nodeJ);
  const axes = resolveFrameLocalAxes({
    nodeI: branchPhysicalEndpoint(pointI, modifier, 'I'),
    nodeJ: branchPhysicalEndpoint(pointJ, modifier, 'J'),
    referenceVector: modifier?.referenceVector ?? [...input.element.localAxes.y],
    profile: FRAME_LOCAL_AXIS_PROFILE,
  });
  if (modifier === null) requireAxisCustody(input.element, axes);

  let frameElement = compileFrameElement({
    elementId: input.element.elementId,
    material: input.material,
    section: input.section,
    localAxes: { result: axes, profile: FRAME_LOCAL_AXIS_PROFILE },
    profile: input.frameProfile,
    distributedLoads: input.distributedLoads,
    temperature: input.temperature,
    releases: [],
    endSprings: modifier?.rotationalSprings ?? [],
    rigidOffsets: branchRigidOffsets(modifier),
  });
  frameElement = augmentBranchRigidThermalFreeState(
    frameElement,
    modifier,
    input.temperatureByElement,
  );
  return Object.freeze({ frameElement, axes, branchModifier: modifier });
}
