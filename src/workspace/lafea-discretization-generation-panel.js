/** Automatic generation and retained-mesh refinement controls for Discretization. */
import { refinementTransitionLadder } from '../core/lafea-meshing/refinement-fields.js';
import { PROFILE_KINDS, defaultProfileFields } from '../core/lafea-profile-contract/index.js';
import { semanticHash } from '../core/shared-primitives/canonical-json.js';
import { button, node, region } from './lafea-discretization-dom.js';
import {
  LAFEA_RETAINED_MESH_REFINEMENT_POLICY,
} from './lafea-retained-mesh-refinement.js';

const PROFILE_SOURCE_REVISION = 'lafea-discretization-ui-mesh-profile/v4';
const SHELL_ELEMENT = 'CST_DKT_TRI3_THIN_SHELL_V1';
const POLICY_COMPARE_EPSILON_FACTOR = 64;

export function generationSection(doc, model, handlers) {
  const generation = model.generation;
  const sourceAdoption = generation.generationMode === 'SOURCE_MESH_ADOPTION';
  const section = region(
    doc,
    sourceAdoption ? 'Source mesh adoption' : 'Automatic mesh generation',
    'generation',
  );
  section.dataset.generationAvailable = String(generation.available);
  section.dataset.generationMode = generation.generationMode ?? 'AUTOMATIC_MESH';
  section.dataset.uiPhase = model.uiPhase;

  if (!generation.producerQualified) {
    section.append(status(doc, 'No qualified governed mesh producer is bound for this stage.'));
    return section;
  }

  section.append(producerEvidence(doc, generation));
  if (sourceAdoption) {
    section.append(disclosure(
      doc,
      'LAFEA.5 preserves the caller-authored host-shell mesh exactly. Binding a profile supplies element-family and quality-gate custody only; it never remeshes the source.',
    ));
  }

  if (!generation.meshProfileBound) {
    if (!model.actions.canBindMeshProfile) {
      section.append(status(doc, unavailableMessage(generation.unavailableReason)));
      return section;
    }
    section.append(profileBindingControls(doc, generation, handlers));
    section.append(status(
      doc,
      sourceAdoption
        ? 'Bind the governed adoption profile before the source mesh can be retained.'
        : 'Bind the governed mesh profile before planning or generating an analysis mesh.',
    ));
    return section;
  }

  if (!generation.available) {
    section.append(status(doc, unavailableMessage(generation.unavailableReason)));
    return section;
  }

  section.append(boundConfiguration(doc, generation, sourceAdoption));
  if (generation.thicknessCurvatureObservation) {
    section.append(thicknessCurvatureObservation(
      doc,
      generation.thicknessCurvatureObservation,
      generation.lengthUnit,
    ));
  }

  const controls = node(doc, 'div', 'lafea-discretization__generation-controls');
  const plan = button(
    doc,
    sourceAdoption ? 'Review adoption plan' : 'Preview mesh plan',
    () => handlers.onPlanMesh?.({}),
  );
  plan.dataset.role = 'lafea-generation-plan';
  plan.disabled = !model.actions.canPlanMesh;
  plan.title = sourceAdoption
    ? 'Checks exact source identity, profile and resource/quality custody without retaining a new child.'
    : 'Runs the governed producer in preview mode. No mesh custody is modified.';

  const generate = button(
    doc,
    sourceAdoption ? 'Adopt and retain source mesh' : 'Generate and retain mesh',
    () => handlers.onGenerateMesh?.({}),
  );
  generate.dataset.role = 'lafea-generation-generate';
  generate.className = 'lafea-button lafea-button--primary';
  generate.disabled = !model.actions.canGenerateMesh;
  generate.title = sourceAdoption
    ? 'Retains the exact caller-authored nodes and TRI3 connectivity after governed checks.'
    : generation.plan?.resourceDisposition === 'BLOCK'
      ? 'The current mesh plan exceeds a governed resource limit.'
      : 'Generates from the already-bound profile and current governed geometry parent.';

  controls.append(plan, generate);
  section.append(controls);
  if (generation.plan) section.append(planSummary(doc, generation.plan));
  section.append(refinementControls(doc, model, handlers));
  return section;
}

function profileBindingControls(doc, generation, handlers) {
  const sourceAdoption = generation.generationMode === 'SOURCE_MESH_ADOPTION';
  const profileDefaults = defaultProfileFields(PROFILE_KINDS.MESH);
  const policy = generation.qualifiedQualityPolicy;
  const host = node(doc, 'fieldset', 'lafea-discretization__profile-binding');
  host.dataset.role = 'lafea-mesh-profile-binding';
  host.append(node(doc, 'legend', null, sourceAdoption ? 'Adoption profile' : 'Mesh profile'));

  if (!policy?.fields) {
    host.append(status(doc, 'Stage-qualified mesh-quality policy is not available; profile binding is blocked.'));
    return host;
  }

  host.append(disclosure(
    doc,
    sourceAdoption
      ? 'Bind the exact source mesh to the stage-qualified shell policy. No topology or coordinate change is authorized.'
      : 'Configure the analysis mesh under the stage-qualified engineering policy. Planning and generation remain separate actions after binding.',
  ));

  const family = selectControl(
    doc,
    'Element family',
    'lafea-profile-element-family',
    generation.elementFamilies,
    preferredFamily(generation.elementFamilies),
  );
  const target = numberControl(
    doc,
    sourceAdoption ? 'Quality-profile reference length' : 'Target element length',
    'lafea-profile-target-length',
    '',
    0,
  );
  target.input.placeholder = generation.lengthUnit
    ? `Enter length in ${generation.lengthUnit}`
    : 'Enter governed target length';

  const baseline = qualityBaseline(policy.fields);
  const advanced = node(doc, 'details', 'lafea-discretization__advanced');
  advanced.append(node(doc, 'summary', null, 'Advanced quality gates'));
  advanced.append(qualifiedPolicyFacts(doc, policy, baseline));
  advanced.append(disclosure(
    doc,
    'These limits come from the source-controlled stage qualification policy. Settings may tighten them but may not weaken them.',
  ));

  const ratio = numberControl(doc, 'Adjacent size ratio max', 'lafea-profile-adjacent-ratio', baseline.adjacentSizeRatioMax, 1);
  ratio.input.max = String(baseline.adjacentSizeRatioMax);
  const aspectWarn = numberControl(doc, 'Aspect ratio warning', 'lafea-profile-aspect-warn', baseline.aspectRatioWarn, 1);
  aspectWarn.input.max = String(baseline.aspectRatioWarn);
  const aspectBlock = numberControl(doc, 'Aspect ratio block', 'lafea-profile-aspect-block', baseline.aspectRatioBlock, 1);
  aspectBlock.input.max = String(baseline.aspectRatioBlock);
  const jacWarn = numberControl(doc, 'Scaled Jacobian warning', 'lafea-profile-jacobian-warn', baseline.scaledJacobianWarn, baseline.scaledJacobianWarn);
  jacWarn.input.max = '1';
  const jacBlock = numberControl(doc, 'Scaled Jacobian block', 'lafea-profile-jacobian-block', baseline.scaledJacobianBlock, baseline.scaledJacobianBlock);
  jacBlock.input.max = '1';
  const adaptive = numberControl(doc, 'Adaptive levels', 'lafea-profile-adaptive-levels', baseline.adaptiveLevels, baseline.adaptiveLevels, '1', true);

  const reset = button(doc, 'Reset qualified limits', () => {
    ratio.input.value = String(baseline.adjacentSizeRatioMax);
    aspectWarn.input.value = String(baseline.aspectRatioWarn);
    aspectBlock.input.value = String(baseline.aspectRatioBlock);
    jacWarn.input.value = String(baseline.scaledJacobianWarn);
    jacBlock.input.value = String(baseline.scaledJacobianBlock);
    adaptive.input.value = String(baseline.adaptiveLevels);
    [ratio, aspectWarn, aspectBlock, jacWarn, jacBlock, adaptive]
      .forEach((control) => control.input.setCustomValidity(''));
  });
  reset.dataset.role = 'lafea-profile-quality-reset';
  advanced.append(ratio.label, aspectWarn.label, aspectBlock.label, jacWarn.label, jacBlock.label, adaptive.label, reset);

  const bind = button(doc, sourceAdoption ? 'Bind adoption profile' : 'Bind mesh profile', () => {
    const selectedFamily = family.input.value;
    if (!generation.elementFamilies.includes(selectedFamily)) {
      invalid(family, 'Select an authorized element family.');
      return;
    }
    family.input.setCustomValidity('');

    const targetValue = Number(target.input.value);
    if (!(targetValue > 0)) {
      invalid(target, 'Profile reference/target length must be greater than zero.');
      return;
    }
    target.input.setCustomValidity('');

    const quality = {
      adjacentSizeRatioMax: Number(ratio.input.value),
      aspectRatioWarn: Number(aspectWarn.input.value),
      aspectRatioBlock: Number(aspectBlock.input.value),
      scaledJacobianWarn: Number(jacWarn.input.value),
      scaledJacobianBlock: Number(jacBlock.input.value),
      adaptiveLevels: Number(adaptive.input.value),
    };
    const qualityControls = { ratio, aspectWarn, aspectBlock, jacWarn, jacBlock, adaptive };
    if (!validateQualifiedQualityControls(quality, baseline, qualityControls)) return;

    const shellFamily = selectedFamily === SHELL_ELEMENT;
    const profileEnvelope = {
      schema: 'lafea-mesh-profile/v1',
      profileIdentity: `LAFEA_UI_${selectedFamily}_MESH_PROFILE_V4`,
      sourceRevision: PROFILE_SOURCE_REVISION,
      fields: {
        continuumElement: shellFamily ? profileDefaults.continuumElement : selectedFamily,
        shellElement: shellFamily ? selectedFamily : profileDefaults.shellElement,
        globalTargetSize: targetValue,
        ...quality,
      },
    };
    profileEnvelope.semanticHash = semanticHash(profileEnvelope);
    handlers.onBindMeshProfile?.(profileEnvelope);
  });
  bind.dataset.role = 'lafea-profile-bind';
  bind.className = 'lafea-button lafea-button--primary';

  host.append(family.label, target.label, advanced, bind);
  return host;
}

function producerEvidence(doc, generation) {
  const details = node(doc, 'details', 'lafea-discretization__technical-evidence');
  details.append(node(doc, 'summary', null, 'Mesh producer and qualification evidence'));
  const facts = node(doc, 'dl', 'lafea-discretization__facts');
  for (const [label, value] of [
    ['Producer', generation.producerRef],
    ['Qualification basis', generation.governanceRef],
    ['Authorized families', generation.elementFamilies.join(', ')],
    ['Local-refinement families', generation.localRefinementElementFamilies.join(', ') || 'NONE'],
    ['Bound mesh profile', generation.meshProfileIdentity ?? 'NOT BOUND'],
  ]) facts.append(node(doc, 'dt', null, label), node(doc, 'dd', null, value ?? 'NONE'));
  details.append(facts);
  return details;
}

function boundConfiguration(doc, generation, sourceAdoption) {
  const facts = node(doc, 'dl', 'lafea-discretization__facts');
  facts.dataset.role = 'lafea-generation-bound-configuration';
  facts.append(
    node(doc, 'dt', null, 'Element family'),
    node(doc, 'dd', null, generation.declaredElementFamily),
    node(doc, 'dt', null, sourceAdoption ? 'Remesh target' : 'Target element length'),
    node(doc, 'dd', null, sourceAdoption
      ? 'NOT APPLICABLE — source mesh is preserved'
      : formatLength(generation.targetElementLength, generation.lengthUnit)),
  );
  return facts;
}

function thicknessCurvatureObservation(doc, observation, unit) {
  const details = node(doc, 'details', 'lafea-discretization__technical-evidence');
  details.dataset.role = 'lafea-thickness-curvature-observation';
  details.append(node(doc, 'summary', null, 'Curvature / thickness observation'));
  const facts = node(doc, 'dl', 'lafea-discretization__facts');
  const thickness = observation.uniformThickness === null
    ? `${formatNumber(observation.minimumThickness)}–${formatNumber(observation.maximumThickness)} ${unit ?? ''}`.trim()
    : `${formatNumber(observation.uniformThickness)} ${unit ?? ''}`.trim();
  const ratio = observation.curvatureSagittaToThicknessRatio === null
    ? 'NOT AVAILABLE — thickness is nonuniform'
    : formatNumber(observation.curvatureSagittaToThicknessRatio);
  for (const [label, value] of [
    ['Thickness basis', `${observation.thicknessClassification} · ${thickness}`],
    ['Cylinder radius', formatLength(observation.radius, unit)],
    ['Requested target', formatLength(observation.requestedTargetElementLength, unit)],
    ['15° curvature target', formatLength(observation.curvatureTargetElementLength, unit)],
    ['Effective curvature target', formatLength(observation.effectiveTargetElementLength, unit)],
    ['Effective curvature angle', `${formatNumber(observation.effectiveCurvatureAngleDegrees)} deg`],
    ['Curvature sagitta', formatLength(observation.curvatureSagitta, unit)],
    ['Sagitta / thickness', ratio],
    ['Qualification', 'NOT GATED — measured engineering evidence only'],
  ]) facts.append(node(doc, 'dt', null, label), node(doc, 'dd', null, value));
  details.append(facts);
  return details;
}

function qualityBaseline(fields) {
  return Object.freeze({
    adjacentSizeRatioMax: fields.adjacentSizeRatioMax,
    aspectRatioWarn: fields.aspectRatioWarn,
    aspectRatioBlock: fields.aspectRatioBlock,
    scaledJacobianWarn: fields.scaledJacobianWarn,
    scaledJacobianBlock: fields.scaledJacobianBlock,
    adaptiveLevels: fields.adaptiveLevelsMinimum,
  });
}

function qualifiedPolicyFacts(doc, policy, baseline) {
  const facts = node(doc, 'dl', 'lafea-discretization__facts');
  facts.dataset.role = 'lafea-qualified-quality-policy';
  for (const [label, value] of [
    ['Policy', `${policy.policyId} · ${policy.revision}`],
    ['Qualified adjacent size ratio max', `≤ ${baseline.adjacentSizeRatioMax}`],
    ['Qualified aspect ratio warning', `≤ ${baseline.aspectRatioWarn}`],
    ['Qualified aspect ratio block', `≤ ${baseline.aspectRatioBlock}`],
    ['Qualified scaled Jacobian warning', `≥ ${baseline.scaledJacobianWarn}`],
    ['Qualified scaled Jacobian block', `≥ ${baseline.scaledJacobianBlock}`],
    ['Minimum adaptive levels', `≥ ${baseline.adaptiveLevels}`],
  ]) facts.append(node(doc, 'dt', null, label), node(doc, 'dd', null, value));
  return facts;
}

function validateQualifiedQualityControls(values, baseline, controls) {
  if (Object.values(values).some((value) => !Number.isFinite(value))) {
    invalid(controls.ratio, 'All quality-gate values must be finite numbers.');
    return false;
  }
  if (values.adjacentSizeRatioMax > baseline.adjacentSizeRatioMax
    || values.aspectRatioWarn > baseline.aspectRatioWarn
    || values.aspectRatioBlock > baseline.aspectRatioBlock
    || values.scaledJacobianWarn < baseline.scaledJacobianWarn
    || values.scaledJacobianBlock < baseline.scaledJacobianBlock
    || values.adaptiveLevels < baseline.adaptiveLevels) {
    invalid(controls.ratio, 'Settings may tighten but may not weaken the stage-qualified mesh-quality policy.');
    return false;
  }
  if (!(values.aspectRatioBlock > values.aspectRatioWarn)) {
    invalid(controls.aspectBlock, 'Aspect-ratio block threshold must exceed the warning threshold.');
    return false;
  }
  if (!(values.scaledJacobianWarn > values.scaledJacobianBlock)) {
    invalid(controls.jacWarn, 'Scaled-Jacobian warning threshold must exceed the block threshold.');
    return false;
  }
  if (!Number.isInteger(values.adaptiveLevels)) {
    invalid(controls.adaptive, 'Adaptive levels must be an integer.');
    return false;
  }
  Object.values(controls).forEach((control) => control.input.setCustomValidity(''));
  return true;
}

function refinementControls(doc, model, handlers) {
  const host = node(doc, 'fieldset', 'lafea-discretization__refinement');
  host.dataset.role = 'lafea-retained-mesh-refinement';
  host.dataset.enabled = String(model.actions.canRefineMesh);
  host.dataset.productScopeEligible = String(model.refinement?.scopeEligible === true);
  host.dataset.productQualified = String(model.refinement?.productQualified === true);
  host.append(node(doc, 'legend', null, 'Local retained-mesh refinement'));
  const family = model.evidence.elementFamily;
  if (!model.evidence.present) {
    host.append(disclosure(doc, 'Retain a current analysis mesh before selecting local refinement targets.'));
    return host;
  }

  const productScoped = model.refinement?.scopeEligible === true;
  const productActive = productScoped
    && model.refinement?.productQualified === true
    && model.actions.canRefineMesh === true;
  if (productScoped) {
    host.append(productRefinementFacts(doc, model.refinement, model.generation.lengthUnit));
    if (!productActive) {
      host.append(disclosure(
        doc,
        `Product refinement scope is recognized, but engineering activation is blocked: ${model.refinement.reason}.`,
      ));
      const pending = button(doc, 'Refine retained mesh', () => {});
      pending.dataset.role = 'lafea-refinement-submit';
      pending.disabled = true;
      pending.title = 'A verified exact-head TECH-13 promotion record is required before this product control can be enabled.';
      host.append(pending);
      return host;
    }
    host.append(disclosure(
      doc,
      'Verified product-refinement promotion is active. Every requested child still has to pass the runtime TECH-13 scope, mesh-quality, adjacency, parent-normal and exact-custody gates before retained custody changes.',
    ));
  }

  if (!productActive && !model.generation.localRefinementElementFamilies.includes(family)) {
    host.append(disclosure(doc, family === 'Q8'
      ? 'Q8 local refinement is not qualified; the UI will not silently convert the topology to triangles.'
      : `Local refinement is not qualified for retained element family ${family ?? 'UNKNOWN'}.`));
    return host;
  }

  const allowedTargetTypes = productActive
    ? model.refinement.allowedTargetTypes
    : ['ELEMENT', 'NODE'];
  const targetType = selectControl(
    doc,
    'Target type',
    'lafea-refinement-target-type',
    allowedTargetTypes,
    allowedTargetTypes[0] ?? 'ELEMENT',
  );
  if (productActive) targetType.input.disabled = true;
  const ids = textControl(doc, 'Target IDs', 'lafea-refinement-target-ids', '', 'E000034 or E000034, E000035');
  const target = numberControl(doc, 'Local target element length', 'lafea-refinement-target-length', '', 0);
  const unit = textControl(doc, 'Length unit', 'lafea-refinement-length-unit', model.generation.lengthUnit ?? '', 'Declared geometry length unit');
  if (model.generation.lengthUnit) unit.input.readOnly = true;

  const sizingPolicy = refinementSizingPolicy(model, productActive);
  if (sizingPolicy) {
    target.input.min = String(sizingPolicy.minimumLocalTarget);
    host.append(refinementSizingFacts(doc, sizingPolicy, model.generation.lengthUnit));
  }
  host.append(disclosure(
    doc,
    model.stageId === 'LAFEA.3'
      ? 'Target IDs are retained analysis-mesh NODE/ELEMENT identities bound to the current parent mesh hashes; they are not source-geometry feature IDs.'
      : 'The target is a retained shell-mesh element identity bound to the current qualified parent mesh.',
  ));

  const preview = node(doc, 'div', 'lafea-discretization__refinement-preview');
  preview.dataset.role = 'lafea-refinement-transition-preview';
  const updatePreview = () => renderRefinementTransitionPreview(
    doc,
    preview,
    target.input.value,
    sizingPolicy,
    model.generation.lengthUnit,
  );
  target.input.addEventListener('input', updatePreview);
  updatePreview();

  const submit = button(doc, 'Refine retained mesh', () => {
    const targetIds = parseTargetIds(ids.input.value);
    if (!targetIds.length) return invalid(ids, 'Enter at least one retained mesh node or element ID.');
    ids.input.setCustomValidity('');
    const targetElementLength = Number(target.input.value);
    const global = Number(model.generation.targetElementLength);
    if (!(targetElementLength > 0 && targetElementLength < global)) {
      return invalid(target, `Local target length must be greater than zero and smaller than the global target ${global}.`);
    }
    if (sizingPolicy && belowMinimumTarget(targetElementLength, sizingPolicy.minimumLocalTarget)) {
      return invalid(
        target,
        `Current qualified local target is at least ${formatLength(sizingPolicy.minimumLocalTarget, model.generation.lengthUnit)} (${formatNumber(sizingPolicy.minimumTargetRatio)} of the global target).`,
      );
    }
    target.input.setCustomValidity('');
    const lengthUnit = unit.input.value.trim();
    if (!lengthUnit) return invalid(unit, 'Length unit is required; it is never inferred silently.');
    unit.input.setCustomValidity('');
    handlers.onRefineMesh?.({
      kind: 'TARGET_LENGTH',
      targetType: targetType.input.value,
      targetIds,
      targetElementLength,
      lengthUnit,
      reason: productActive
        ? 'User-governed LAFEA.4 product local refinement under verified TECH-13 promotion'
        : 'User-governed retained analysis-mesh local refinement',
    });
  });
  submit.dataset.role = 'lafea-refinement-submit';
  submit.disabled = !model.actions.canRefineMesh;
  host.append(targetType.label, ids.label, target.label, unit.label, preview, submit);
  return host;
}

function refinementSizingPolicy(model, productActive) {
  const globalTarget = Number(model.generation.targetElementLength);
  const growthRatioMax = Number(model.generation.boundAdjacentSizeRatioMax);
  if (!(globalTarget > 0 && growthRatioMax > 1)) return null;

  if (model.stageId === 'LAFEA.3' && !productActive) {
    const minimumTargetRatio = LAFEA_RETAINED_MESH_REFINEMENT_POLICY.minimumTargetRatio;
    return Object.freeze({
      stageId: 'LAFEA.3',
      globalTarget,
      growthRatioMax,
      minimumTargetRatio,
      minimumLocalTarget: globalTarget * minimumTargetRatio,
      basis: 'LAFEA_RETAINED_MESH_REFINEMENT_POLICY.minimumTargetRatio',
      transitionScope: 'GRADED_PREVIEW_ACTUAL_CHILD_MUST_PASS_ADJACENT_SIZE_RATIO',
    });
  }

  if (model.stageId === 'LAFEA.4' && productActive) {
    const minimumTargetRatio = 1 / growthRatioMax;
    return Object.freeze({
      stageId: 'LAFEA.4',
      globalTarget,
      growthRatioMax,
      minimumTargetRatio,
      minimumLocalTarget: globalTarget * minimumTargetRatio,
      basis: 'CURRENT_UNGRADED_SHELL_REFINEMENT_ONE_ADJACENCY_STEP',
      transitionScope: 'DEEPER_TARGET_REQUIRES_GRADED_TRANSITION_QUALIFICATION',
    });
  }
  return null;
}

function refinementSizingFacts(doc, policy, unit) {
  const details = node(doc, 'details', 'lafea-discretization__technical-evidence');
  details.dataset.role = 'lafea-refinement-sizing-policy';
  details.open = true;
  details.append(node(doc, 'summary', null, 'Qualified local-sizing envelope'));
  const facts = node(doc, 'dl', 'lafea-discretization__facts');
  const rows = [
    ['Global target', formatLength(policy.globalTarget, unit)],
    ['Minimum current local target', formatLength(policy.minimumLocalTarget, unit)],
    ['Minimum local / global ratio', `≥ ${formatNumber(policy.minimumTargetRatio)}`],
    ['Bound adjacent size ratio max', `≤ ${formatNumber(policy.growthRatioMax)}`],
    ['Policy basis', policy.basis],
  ];
  for (const [label, value] of rows) {
    facts.append(node(doc, 'dt', null, label), node(doc, 'dd', null, value));
  }
  details.append(facts);
  return details;
}

function renderRefinementTransitionPreview(doc, host, rawTarget, policy, unit) {
  host.replaceChildren();
  if (!policy) {
    host.append(disclosure(doc, 'No stage-specific local sizing envelope is available for transition preview.'));
    return;
  }
  const localTarget = Number(rawTarget);
  if (!Number.isFinite(localTarget) || localTarget <= 0) {
    host.append(disclosure(
      doc,
      `Enter a local target between ${formatLength(policy.minimumLocalTarget, unit)} and ${formatLength(policy.globalTarget, unit)} to preview the governed size transition.`,
    ));
    return;
  }
  if (belowMinimumTarget(localTarget, policy.minimumLocalTarget)) {
    host.dataset.status = 'BLOCK';
    host.append(status(
      doc,
      `Blocked preview: local/global=${formatNumber(localTarget / policy.globalTarget)} is below the current qualified minimum ${formatNumber(policy.minimumTargetRatio)}.`,
    ));
    return;
  }
  if (!(localTarget < policy.globalTarget)) {
    host.dataset.status = 'BLOCK';
    host.append(status(doc, 'Blocked preview: local target must be smaller than the global target.'));
    return;
  }

  const ladder = refinementTransitionLadder(
    policy.globalTarget,
    localTarget,
    policy.growthRatioMax,
  );
  host.dataset.status = 'PREVIEW';
  const facts = node(doc, 'dl', 'lafea-discretization__facts');
  const rows = [
    ['Sizing transition', ladder.levels.map((value) => formatLength(value, unit)).join(' → ')],
    ['Growth steps', String(ladder.growthStepCount)],
    ['Maximum preview adjacent ratio', formatNumber(ladder.maximumObservedRatio)],
    ['Bound adjacent size ratio max', `≤ ${formatNumber(ladder.growthRatioMax)}`],
  ];
  for (const [label, value] of rows) {
    facts.append(node(doc, 'dt', null, label), node(doc, 'dd', null, value));
  }
  host.append(facts, disclosure(
    doc,
    'Sizing preview only. The retained child mesh must independently pass the actual ADJACENT_SIZE_RATIO quality gate; the preview does not certify generated topology.',
  ));
}

function belowMinimumTarget(value, minimum) {
  const tolerance = POLICY_COMPARE_EPSILON_FACTOR * Number.EPSILON
    * Math.max(1, Math.abs(minimum));
  return value < minimum - tolerance;
}

function productRefinementFacts(doc, refinement, unit) {
  const details = node(doc, 'details', 'lafea-discretization__technical-evidence');
  details.dataset.role = 'lafea-product-refinement-qualification-evidence';
  details.open = true;
  details.append(node(doc, 'summary', null, 'Product local-refinement qualification evidence'));
  const facts = node(doc, 'dl', 'lafea-discretization__facts');
  const rows = [
    ['Product scope', `${refinement.surfaceKind} · ${refinement.elementFamily}`],
    ['Allowed targets', refinement.allowedTargetTypes.join(', ')],
    ['Parent nodes / elements', `${refinement.currentParent.nodeCount} / ${refinement.currentParent.elementCount}`],
    ['Parent artifact hash', refinement.currentParent.artifactHash],
    ['Parent mesh hash', refinement.currentParent.meshHash],
    ['Global target', formatLength(refinement.sizing.globalTargetElementLength, unit)],
    ['Adjacent size ratio max', `≤ ${formatNumber(refinement.sizing.adjacentSizeRatioMax)}`],
    ['Aspect ratio warning / block', `≤ ${formatNumber(refinement.qualityPolicy.aspectRatioWarn)} / ≤ ${formatNumber(refinement.qualityPolicy.aspectRatioBlock)}`],
    ['Scaled Jacobian warning / block', `≥ ${formatNumber(refinement.qualityPolicy.scaledJacobianWarn)} / ≥ ${formatNumber(refinement.qualityPolicy.scaledJacobianBlock)}`],
    ['Minimum angle block', `> ${formatNumber(refinement.qualityPolicy.minimumAngleBlockDegrees)} deg`],
    ['Parent-normal gate', refinement.requiredAcceptance.parentNormalPass ? 'REQUIRED' : 'NOT REQUIRED'],
    ['Boundary conformity', refinement.requiredAcceptance.boundaryConformity ? 'REQUIRED' : 'NOT REQUIRED'],
    ['Exact parent custody', refinement.requiredAcceptance.exactParentCustody ? 'REQUIRED' : 'NOT REQUIRED'],
    ['Product qualification', refinement.productQualified ? 'QUALIFIED FOR RUNTIME GATING' : 'PENDING VERIFIED EXACT-HEAD PROMOTION'],
    ['Qualified production head', refinement.promotion?.qualifiedHead ?? 'NONE'],
  ];
  for (const [label, value] of rows) {
    facts.append(node(doc, 'dt', null, label), node(doc, 'dd', null, value ?? 'NONE'));
  }
  details.append(facts);
  return details;
}

function planSummary(doc, plan) {
  const summary = node(doc, 'div', 'lafea-discretization__plan');
  summary.dataset.role = 'lafea-generation-plan-summary';
  summary.dataset.strategy = plan.strategy;
  summary.dataset.disposition = plan.resourceDisposition;
  const facts = node(doc, 'dl', 'lafea-discretization__facts');
  const characteristic = [plan.characteristicLengthMin, plan.characteristicLengthMedian, plan.characteristicLengthMax]
    .map(formatNumber).join(' / ');
  for (const [label, value] of [
    ['Generation mode', plan.generationMode ?? 'AUTOMATIC_MESH'],
    ['Strategy', `${plan.strategy} (${plan.strategyReason})`],
    ['Element family', plan.elementFamily],
    ['Nodes', String(plan.nodeCount)],
    ['Elements', String(plan.elementCount)],
    ['Estimated DOFs', String(plan.estimatedDofs)],
    ['Boundary edges', plan.boundarySegmentCount === null ? 'UNCHANGED_PARENT_BOUNDARY' : String(plan.boundarySegmentCount)],
    ['Characteristic length min / median / max', characteristic],
    ['Resource disposition', plan.resourceDisposition],
  ]) facts.append(node(doc, 'dt', null, label), node(doc, 'dd', null, value));
  summary.append(facts);
  return summary;
}

function preferredFamily(families) {
  if (!Array.isArray(families) || !families.length) return null;
  if (families.length === 1) return families[0];
  if (families.includes('T6_QUADRATIC_TRIANGLE')) return 'T6_QUADRATIC_TRIANGLE';
  return families[0];
}
function selectControl(doc, labelText, role, values, selected) {
  const label = node(doc, 'label', null, `${labelText} `);
  const input = node(doc, 'select');
  input.dataset.role = role;
  input.required = true;
  for (const value of values) {
    const option = node(doc, 'option', null, value);
    option.value = value;
    option.selected = value === selected;
    input.append(option);
  }
  label.append(input);
  return { label, input };
}
function numberControl(doc, labelText, role, value, min, step = 'any', integer = false) {
  const label = node(doc, 'label', null, `${labelText} `);
  const input = node(doc, 'input');
  input.type = 'number';
  input.min = String(min);
  input.step = integer ? '1' : step;
  input.value = String(value);
  input.dataset.role = role;
  label.append(input);
  return { label, input };
}
function textControl(doc, labelText, role, value, placeholder) {
  const label = node(doc, 'label', null, `${labelText} `);
  const input = node(doc, 'input');
  input.type = 'text';
  input.value = value;
  input.placeholder = placeholder;
  input.dataset.role = role;
  label.append(input);
  return { label, input };
}
function invalid(control, message) {
  control.input.setCustomValidity(message);
  control.input.reportValidity?.();
  return undefined;
}
function status(doc, text) {
  const value = node(doc, 'p', 'lafea-discretization__status', text);
  value.dataset.role = 'lafea-generation-status';
  return value;
}
function disclosure(doc, text) { return node(doc, 'p', 'lafea-discretization__disclosure', text); }
function unavailableMessage(reason) {
  const messages = {
    QUALIFIED_MESH_PRODUCER_NOT_AVAILABLE: 'A qualified mesh producer is not available for this stage.',
    ANALYSIS_MESH_GENERATION_REQUIRES_SHELL_MIDSURFACE_EVIDENCE: 'A current shell midsurface parent is required before mesh configuration.',
    SHELL_MIDSURFACE_NOT_CURRENT: 'The retained shell midsurface is stale or does not match the current source.',
    ANALYSIS_MESH_GENERATION_REQUIRES_DOMAIN_FIRST_PROFILE: 'A current analysis domain is required before mesh configuration.',
    ANALYSIS_GEOMETRY_NOT_CURRENT: 'The retained analysis geometry is not current.',
    ANALYSIS_MESH_PROFILE_BINDING_REQUIRED: 'Bind a governed mesh profile before planning or generation.',
  };
  return messages[reason] ?? reason ?? 'Mesh generation is not ready.';
}
function parseTargetIds(value) {
  return [...new Set(String(value).split(/[\s,]+/u).map((item) => item.trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}
function formatLength(value, unit) { return `${value ?? 'UNSET'}${unit ? ` ${unit}` : ' (unit unavailable)'}`; }
function formatNumber(value) { return Number.isFinite(value) ? value.toPrecision(4) : 'NOT REPORTED'; }
