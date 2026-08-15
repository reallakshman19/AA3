/** Automatic generation and retained-mesh refinement controls for Discretization. */
import { PROFILE_KINDS, defaultProfileFields } from '../core/lafea-profile-contract/index.js';
import { semanticHash } from '../core/shared-primitives/canonical-json.js';
import { button, node, region } from './lafea-discretization-dom.js';

const PROFILE_SOURCE_REVISION = 'lafea-discretization-ui-mesh-profile/v2';
const SHELL_ELEMENT_PLACEHOLDER = 'CST_DKT_TRI3_THIN_SHELL_V1';

/**
 * Automatic mesh generation. Rendered whenever the stage is mesh applicable,
 * so a stage without a bound producer still says plainly why the controls are
 * unavailable rather than hiding them.
 */
export function generationSection(doc, model, handlers) {
  const section = region(doc, 'Automatic mesh generation', 'generation');
  const generation = model.generation;
  section.dataset.generationAvailable = String(generation.available);

  if (!generation.producerQualified) {
    section.append(node(
      doc,
      'p',
      null,
      'No qualified automatic mesh producer is bound for this stage. Proposed topology, quality forecasts and configuration hashes are intentionally not manufactured.',
    ));
    return section;
  }

  const identity = node(doc, 'dl', 'lafea-discretization__facts');
  identity.dataset.role = 'lafea-generation-producer';
  for (const [label, value] of [
    ['Producer', generation.producerRef],
    ['Qualification basis', generation.governanceRef],
    ['Authorized families', generation.elementFamilies.join(', ')],
    ['Local-refinement families', generation.localRefinementElementFamilies.join(', ') || 'NONE'],
    ['Bound mesh profile', generation.meshProfileIdentity ?? 'NOT_BOUND'],
  ]) {
    identity.append(node(doc, 'dt', null, label), node(doc, 'dd', null, value ?? 'NONE'));
  }
  section.append(identity);

  if (!generation.meshProfileBound) {
    section.append(profileBindingControls(doc, generation, handlers));
  }

  if (!generation.available) {
    const blocked = node(doc, 'p', 'lafea-discretization__status', generation.unavailableReason);
    blocked.dataset.role = 'lafea-generation-unavailable';
    section.append(blocked);
    return section;
  }

  const governed = node(doc, 'dl', 'lafea-discretization__facts');
  governed.dataset.role = 'lafea-generation-bound-configuration';
  governed.append(
    node(doc, 'dt', null, 'Governing element family'),
    node(doc, 'dd', null, generation.declaredElementFamily),
    node(doc, 'dt', null, 'Governing target element length'),
    node(doc, 'dd', null, formatLength(generation.targetElementLength, generation.lengthUnit)),
  );
  section.append(governed);

  const controls = node(doc, 'div', 'lafea-discretization__generation-controls');
  const plan = button(doc, 'Plan mesh', () => handlers.onPlanMesh?.({}));
  plan.dataset.role = 'lafea-generation-plan';
  plan.disabled = !model.actions.canPlanMesh;
  plan.title = 'Runs the producer from the bound profile and reports the result. Custody is not modified.';

  const generate = button(doc, 'Generate and retain mesh', () => handlers.onGenerateMesh?.({}));
  generate.dataset.role = 'lafea-generation-generate';
  generate.disabled = !model.actions.canGenerateMesh;
  generate.title = 'Generation uses the bound profile exactly; change family or size by binding a new profile.';

  controls.append(plan, generate);
  section.append(controls);

  if (model.generation.plan) section.append(planSummary(doc, model.generation.plan));
  section.append(refinementControls(doc, model, handlers));
  return section;
}

/**
 * Profile binding is an explicit engineering action. Quality-policy defaults
 * are visible and exportable, and the qualified baseline is enforced at both
 * this UI and the mesh-evidence contract. Users may tighten the limits; a
 * weaker profile cannot silently retain stage-qualified mesh authority.
 * Element family and target length remain explicit caller choices.
 */
function profileBindingControls(doc, generation, handlers) {
  const defaults = defaultProfileFields(PROFILE_KINDS.MESH);
  const host = node(doc, 'fieldset', 'lafea-discretization__profile-binding');
  host.dataset.role = 'lafea-mesh-profile-binding';
  host.append(node(doc, 'legend', null, 'Mesh Generation'));
  host.append(node(
    doc,
    'p',
    'lafea-discretization__disclosure',
    'Generate with the visible qualified profile, or expand Advanced Quality Gates to tighten engineering acceptance. Qualified limits cannot be weakened.',
  ));

  const family = selectControl(
    doc,
    'Element family',
    'lafea-profile-element-family',
    generation.elementFamilies,
    null,
  );
  if (generation.elementFamilies.includes('T6_QUADRATIC_TRIANGLE')) {
    family.input.value = 'T6_QUADRATIC_TRIANGLE';
  }
  const target = numberControl(doc, 'Target element length', 'lafea-profile-target-length', '', 0);
  target.input.value = '15';

  const advanced = node(doc, 'details', 'lafea-discretization__advanced');
  advanced.append(node(doc, 'summary', null, 'Advanced Quality Gates'));
  advanced.append(qualifiedPolicyFacts(doc, defaults));
  advanced.append(node(
    doc,
    'p',
    'lafea-discretization__disclosure',
    'Tightening direction: lower aspect/adjacent-ratio limits and higher scaled-Jacobian limits are stricter. The profile hash records every selected value.',
  ));

  const ratio = numberControl(
    doc, 'Adjacent size ratio max', 'lafea-profile-adjacent-ratio', defaults.adjacentSizeRatioMax, 1,
  );
  ratio.input.max = String(defaults.adjacentSizeRatioMax);
  const aspectWarn = numberControl(
    doc, 'Aspect ratio warning', 'lafea-profile-aspect-warn', defaults.aspectRatioWarn, 1,
  );
  aspectWarn.input.max = String(defaults.aspectRatioWarn);
  const aspectBlock = numberControl(
    doc, 'Aspect ratio block', 'lafea-profile-aspect-block', defaults.aspectRatioBlock, 1,
  );
  aspectBlock.input.max = String(defaults.aspectRatioBlock);
  const jacWarn = numberControl(
    doc, 'Scaled Jacobian warning', 'lafea-profile-jacobian-warn', defaults.scaledJacobianWarn, defaults.scaledJacobianWarn,
  );
  jacWarn.input.max = '1';
  const jacBlock = numberControl(
    doc, 'Scaled Jacobian block', 'lafea-profile-jacobian-block', defaults.scaledJacobianBlock, defaults.scaledJacobianBlock,
  );
  jacBlock.input.max = '1';
  const adaptive = numberControl(
    doc, 'Adaptive levels', 'lafea-profile-adaptive-levels', defaults.adaptiveLevels, 3, '1', true,
  );

  const reset = button(doc, 'Reset qualified limits', () => {
    ratio.input.value = String(defaults.adjacentSizeRatioMax);
    aspectWarn.input.value = String(defaults.aspectRatioWarn);
    aspectBlock.input.value = String(defaults.aspectRatioBlock);
    jacWarn.input.value = String(defaults.scaledJacobianWarn);
    jacBlock.input.value = String(defaults.scaledJacobianBlock);
    adaptive.input.value = String(defaults.adaptiveLevels);
    [ratio, aspectWarn, aspectBlock, jacWarn, jacBlock, adaptive]
      .forEach((control) => control.input.setCustomValidity(''));
  });
  reset.dataset.role = 'lafea-profile-quality-reset';
  reset.title = 'Restore the source-controlled qualified engineering limits.';

  advanced.append(
    ratio.label,
    aspectWarn.label,
    aspectBlock.label,
    jacWarn.label,
    jacBlock.label,
    adaptive.label,
    reset,
  );

  const bind = button(doc, 'Generate Mesh', () => {
    const selectedFamily = family.input.value;
    if (!generation.elementFamilies.includes(selectedFamily)) {
      family.input.setCustomValidity('Select an authorized element family.');
      family.input.reportValidity?.();
      return;
    }
    family.input.setCustomValidity('');
    const targetValue = Number(target.input.value);
    if (!(targetValue > 0)) {
      target.input.setCustomValidity('Target element length must be greater than zero.');
      target.input.reportValidity?.();
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
    if (!validateQualifiedQualityControls(
      quality,
      defaults,
      { ratio, aspectWarn, aspectBlock, jacWarn, jacBlock, adaptive },
    )) return;

    const profileEnvelope = {
      schema: 'lafea-mesh-profile/v1',
      profileIdentity: `LAFEA3_UI_${selectedFamily}_MESH_PROFILE_V2`,
      sourceRevision: PROFILE_SOURCE_REVISION,
      fields: {
        continuumElement: selectedFamily,
        shellElement: SHELL_ELEMENT_PLACEHOLDER,
        globalTargetSize: targetValue,
        ...quality,
      },
    };
    profileEnvelope.semanticHash = semanticHash(profileEnvelope);
    handlers.onBindMeshProfile?.(profileEnvelope);
    handlers.onGenerateMesh?.({});
  });
  bind.dataset.role = 'lafea-profile-bind';
  bind.className = 'lafea-button lafea-button--primary';

  host.append(
    family.label,
    target.label,
    advanced,
    bind,
  );
  return host;
}

function qualifiedPolicyFacts(doc, defaults) {
  const facts = node(doc, 'dl', 'lafea-discretization__facts');
  facts.dataset.role = 'lafea-qualified-quality-policy';
  for (const [label, value] of [
    ['Qualified adjacent size ratio max', `≤ ${defaults.adjacentSizeRatioMax}`],
    ['Qualified aspect ratio warning', `≤ ${defaults.aspectRatioWarn}`],
    ['Qualified aspect ratio block', `≤ ${defaults.aspectRatioBlock}`],
    ['Qualified scaled Jacobian warning', `≥ ${defaults.scaledJacobianWarn}`],
    ['Qualified scaled Jacobian block', `≥ ${defaults.scaledJacobianBlock}`],
    ['Minimum adaptive levels', `≥ ${defaults.adaptiveLevels}`],
  ]) {
    facts.append(node(doc, 'dt', null, label), node(doc, 'dd', null, value));
  }
  return facts;
}

function validateQualifiedQualityControls(values, defaults, controls) {
  const entries = Object.values(values);
  if (entries.some((value) => !Number.isFinite(value))) {
    controls.ratio.input.setCustomValidity('All quality-gate values must be finite numbers.');
    controls.ratio.input.reportValidity?.();
    return false;
  }
  if (values.adjacentSizeRatioMax > defaults.adjacentSizeRatioMax
    || values.aspectRatioWarn > defaults.aspectRatioWarn
    || values.aspectRatioBlock > defaults.aspectRatioBlock
    || values.scaledJacobianWarn < defaults.scaledJacobianWarn
    || values.scaledJacobianBlock < defaults.scaledJacobianBlock
    || values.adaptiveLevels < defaults.adaptiveLevels) {
    controls.ratio.input.setCustomValidity('Settings may tighten but may not weaken the qualified LAFEA.3 mesh-quality policy.');
    controls.ratio.input.reportValidity?.();
    return false;
  }
  if (!(values.aspectRatioBlock > values.aspectRatioWarn)) {
    controls.aspectBlock.input.setCustomValidity('Aspect-ratio block threshold must exceed the warning threshold.');
    controls.aspectBlock.input.reportValidity?.();
    return false;
  }
  if (!(values.scaledJacobianWarn > values.scaledJacobianBlock)) {
    controls.jacWarn.input.setCustomValidity('Scaled-Jacobian warning threshold must exceed the block threshold.');
    controls.jacWarn.input.reportValidity?.();
    return false;
  }
  if (!Number.isInteger(values.adaptiveLevels)) {
    controls.adaptive.input.setCustomValidity('Adaptive levels must be an integer.');
    controls.adaptive.input.reportValidity?.();
    return false;
  }
  Object.values(controls).forEach((control) => control.input.setCustomValidity(''));
  return true;
}

function refinementControls(doc, model, handlers) {
  const host = node(doc, 'fieldset', 'lafea-discretization__refinement');
  host.dataset.role = 'lafea-retained-mesh-refinement';
  host.dataset.enabled = String(model.actions.canRefineMesh);
  host.append(node(doc, 'legend', null, 'Local retained-mesh refinement'));

  const family = model.evidence.elementFamily;
  if (!model.evidence.present) {
    host.append(node(
      doc,
      'p',
      'lafea-discretization__disclosure',
      'Generate or recover a current retained analysis mesh before selecting local refinement targets.',
    ));
    return host;
  }
  if (!model.generation.localRefinementElementFamilies.includes(family)) {
    host.append(node(
      doc,
      'p',
      'lafea-discretization__disclosure',
      family === 'Q8'
        ? 'Q8 local refinement is not qualified. A conforming quadrilateral local-refinement rule is required; this surface will not silently convert Q8 topology to triangles.'
        : `Local refinement is not qualified for retained element family ${family ?? 'UNKNOWN'}.`,
    ));
    return host;
  }

  host.append(node(
    doc,
    'p',
    'lafea-discretization__disclosure',
    'Targets are canonical IDs from the currently retained v2 analysis mesh. The parent artifact and mesh hashes are taken from custody by the orchestrator, not accepted from this form. A rejected refinement leaves the retained parent unchanged.',
  ));

  const targetType = selectControl(
    doc,
    'Target type',
    'lafea-refinement-target-type',
    ['ELEMENT', 'NODE'],
    'ELEMENT',
  );
  const ids = textControl(
    doc,
    'Target IDs',
    'lafea-refinement-target-ids',
    '',
    'E000034 or E000034, E000035',
  );
  const target = numberControl(
    doc,
    'Local target element length',
    'lafea-refinement-target-length',
    '',
    0,
  );
  const unit = textControl(
    doc,
    'Length unit',
    'lafea-refinement-length-unit',
    model.generation.lengthUnit ?? '',
    'Declared geometry length unit',
  );
  if (model.generation.lengthUnit) unit.input.readOnly = true;

  const submit = button(doc, 'Refine retained mesh', () => {
    const targetIds = parseTargetIds(ids.input.value);
    if (!targetIds.length) {
      ids.input.setCustomValidity('Enter at least one retained mesh node or element ID.');
      ids.input.reportValidity?.();
      return;
    }
    ids.input.setCustomValidity('');

    const targetElementLength = Number(target.input.value);
    const global = Number(model.generation.targetElementLength);
    if (!(targetElementLength > 0 && targetElementLength < global)) {
      target.input.setCustomValidity(`Local target length must be greater than zero and smaller than the global target ${global}.`);
      target.input.reportValidity?.();
      return;
    }
    if (targetElementLength < global * 0.25) {
      target.input.setCustomValidity(`Qualified local target length is at least 25% of the global target (${global * 0.25}).`);
      target.input.reportValidity?.();
      return;
    }
    target.input.setCustomValidity('');

    const lengthUnit = unit.input.value.trim();
    if (!lengthUnit) {
      unit.input.setCustomValidity('Length unit is required; it is never inferred silently.');
      unit.input.reportValidity?.();
      return;
    }
    unit.input.setCustomValidity('');

    handlers.onRefineMesh?.({
      kind: 'TARGET_LENGTH',
      targetType: targetType.input.value,
      targetIds,
      targetElementLength,
      lengthUnit,
      reason: 'User-governed retained analysis-mesh local refinement',
    });
  });
  submit.dataset.role = 'lafea-refinement-submit';
  submit.disabled = !model.actions.canRefineMesh;
  submit.title = model.actions.canRefineMesh
    ? 'Refines the exact retained parent and replaces custody only after the child evidence passes.'
    : 'A current qualified T3/T6 retained mesh is required.';

  host.append(targetType.label, ids.label, target.label, unit.label, submit);
  return host;
}

function selectControl(doc, labelText, role, values, selected) {
  const label = node(doc, 'label', null, `${labelText} `);
  const input = node(doc, 'select');
  input.dataset.role = role;
  input.required = true;
  if (selected === null) {
    const placeholder = node(doc, 'option', null, 'Select element family');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.selected = true;
    input.append(placeholder);
  }
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

function planSummary(doc, plan) {
  const summary = node(doc, 'div', 'lafea-discretization__plan');
  summary.dataset.role = 'lafea-generation-plan-summary';
  summary.dataset.strategy = plan.strategy;
  summary.dataset.disposition = plan.resourceDisposition;
  const facts = node(doc, 'dl', 'lafea-discretization__facts');
  const characteristic = [
    plan.characteristicLengthMin,
    plan.characteristicLengthMedian,
    plan.characteristicLengthMax,
  ].map(formatNumber).join(' / ');
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
    ['Plan hash', plan.planHash],
  ]) {
    facts.append(node(doc, 'dt', null, label), node(doc, 'dd', null, value));
  }
  summary.append(facts);

  if (plan.strategy === 'CONSTRAINED_DELAUNAY') {
    summary.append(node(
      doc,
      'p',
      'lafea-discretization__disclosure',
      'The current constrained-Delaunay path performs deterministic interior Steiner refinement driven by the governed global target length, then restores constrained Delaunay connectivity before higher-order upgrade.',
    ));
  }
  if (plan.strategy === 'RETAINED_LOCAL_REFINEMENT') {
    summary.append(node(
      doc,
      'p',
      'lafea-discretization__disclosure',
      `Local refinement child of ${plan.parentMeshHash}; ${plan.localPointCount} deterministic local points inserted around ${plan.targetType} target(s) ${plan.targetIds.join(', ')}.`,
    ));
  }
  return summary;
}

function parseTargetIds(value) {
  return [...new Set(String(value).split(/[\s,]+/u).map((item) => item.trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}
function formatLength(value, unit) {
  return `${value ?? 'UNSET'}${unit ? ` ${unit}` : ' (unit unavailable)'}`;
}
function formatNumber(value) {
  return Number.isFinite(value) ? value.toPrecision(4) : 'NOT_REPORTED';
}