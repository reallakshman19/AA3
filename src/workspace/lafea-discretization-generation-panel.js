/** Automatic mesh-generation controls for the Discretization surface. */
import { PROFILE_KINDS, defaultProfileFields } from '../core/lafea-profile-contract/index.js';
import { button, node, region } from './lafea-discretization-dom.js';

const PROFILE_SOURCE_REVISION = 'lafea-discretization-ui-mesh-profile/v1';
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

  const controls = node(doc, 'div', 'lafea-discretization__generation-controls');

  const familyLabel = node(doc, 'label', null, 'Element family ');
  const family = node(doc, 'select');
  family.dataset.role = 'lafea-generation-element-family';
  for (const option of generation.elementFamilies) {
    const item = node(doc, 'option', null, option);
    item.value = option;
    if (option === generation.declaredElementFamily) item.selected = true;
    family.append(item);
  }
  familyLabel.append(family);

  const sizeLabel = node(doc, 'label', null, 'Target element length ');
  const size = node(doc, 'input');
  size.type = 'number';
  size.min = '0';
  size.step = 'any';
  size.value = String(generation.targetElementLength ?? '');
  size.dataset.role = 'lafea-generation-target-length';
  sizeLabel.append(size);

  const overrides = () => ({
    elementFamily: family.value,
    targetElementLength: Number(size.value),
  });

  const plan = button(doc, 'Plan mesh', () => handlers.onPlanMesh?.(overrides()));
  plan.dataset.role = 'lafea-generation-plan';
  plan.disabled = !model.actions.canPlanMesh;
  plan.title = 'Runs the producer and reports the result. Custody is not modified.';

  const generate = button(doc, 'Generate and retain mesh', () => handlers.onGenerateMesh?.(overrides()));
  generate.dataset.role = 'lafea-generation-generate';
  generate.disabled = !model.actions.canGenerateMesh;

  controls.append(familyLabel, sizeLabel, plan, generate);
  section.append(controls);

  if (model.generation.plan) section.append(planSummary(doc, model.generation.plan));
  return section;
}

/**
 * Profile binding is an explicit engineering action. Only quality-policy
 * defaults are prefilled, and those values are visible in editable controls.
 * Element family and target length are never inferred from the generic default
 * profile because that profile currently declares a mixed family outside the
 * bound producer's uniform-family contract.
 */
function profileBindingControls(doc, generation, handlers) {
  const defaults = defaultProfileFields(PROFILE_KINDS.MESH);
  const host = node(doc, 'fieldset', 'lafea-discretization__profile-binding');
  host.dataset.role = 'lafea-mesh-profile-binding';
  host.append(node(doc, 'legend', null, 'Bind governed LAFEA.3 mesh profile'));
  host.append(node(
    doc,
    'p',
    'lafea-discretization__disclosure',
    'Choose the element family and target length explicitly. Quality-gate values below are the source-controlled profile defaults and remain visible before binding.',
  ));

  const family = selectControl(
    doc,
    'Element family',
    'lafea-profile-element-family',
    generation.elementFamilies,
    generation.elementFamilies.includes('Q8') ? 'Q8' : generation.elementFamilies[0],
  );
  const target = numberControl(doc, 'Target element length', 'lafea-profile-target-length', '', 0);
  const ratio = numberControl(
    doc, 'Adjacent size ratio max', 'lafea-profile-adjacent-ratio', defaults.adjacentSizeRatioMax, 1,
  );
  const aspectWarn = numberControl(
    doc, 'Aspect ratio warning', 'lafea-profile-aspect-warn', defaults.aspectRatioWarn, 1,
  );
  const aspectBlock = numberControl(
    doc, 'Aspect ratio block', 'lafea-profile-aspect-block', defaults.aspectRatioBlock, 1,
  );
  const jacWarn = numberControl(
    doc, 'Scaled Jacobian warning', 'lafea-profile-jacobian-warn', defaults.scaledJacobianWarn, 0,
  );
  const jacBlock = numberControl(
    doc, 'Scaled Jacobian block', 'lafea-profile-jacobian-block', defaults.scaledJacobianBlock, 0,
  );
  const adaptive = numberControl(
    doc, 'Adaptive levels', 'lafea-profile-adaptive-levels', defaults.adaptiveLevels, 1, '1', true,
  );

  const bind = button(doc, 'Bind mesh profile', () => {
    const targetValue = Number(target.input.value);
    if (!(targetValue > 0)) {
      target.input.setCustomValidity('Target element length must be greater than zero.');
      target.input.reportValidity?.();
      return;
    }
    target.input.setCustomValidity('');
    const selectedFamily = family.input.value;
    handlers.onBindMeshProfile?.({
      schema: 'lafea-mesh-profile/v1',
      profileIdentity: `LAFEA3_UI_${selectedFamily}_MESH_PROFILE_V1`,
      sourceRevision: PROFILE_SOURCE_REVISION,
      semanticHash: undefined,
      fields: {
        continuumElement: selectedFamily,
        shellElement: SHELL_ELEMENT_PLACEHOLDER,
        globalTargetSize: targetValue,
        adjacentSizeRatioMax: Number(ratio.input.value),
        aspectRatioWarn: Number(aspectWarn.input.value),
        aspectRatioBlock: Number(aspectBlock.input.value),
        scaledJacobianWarn: Number(jacWarn.input.value),
        scaledJacobianBlock: Number(jacBlock.input.value),
        adaptiveLevels: Number(adaptive.input.value),
      },
    });
  });
  bind.dataset.role = 'lafea-profile-bind';

  host.append(
    family.label,
    target.label,
    ratio.label,
    aspectWarn.label,
    aspectBlock.label,
    jacWarn.label,
    jacBlock.label,
    adaptive.label,
    bind,
  );
  return host;
}

function selectControl(doc, labelText, role, values, selected) {
  const label = node(doc, 'label', null, `${labelText} `);
  const input = node(doc, 'select');
  input.dataset.role = role;
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

function planSummary(doc, plan) {
  const summary = node(doc, 'div', 'lafea-discretization__plan');
  summary.dataset.role = 'lafea-generation-plan-summary';
  summary.dataset.strategy = plan.strategy;
  summary.dataset.disposition = plan.resourceDisposition;
  const facts = node(doc, 'dl', 'lafea-discretization__facts');
  for (const [label, value] of [
    ['Strategy', `${plan.strategy} (${plan.strategyReason})`],
    ['Element family', plan.elementFamily],
    ['Nodes', String(plan.nodeCount)],
    ['Elements', String(plan.elementCount)],
    ['Estimated DOFs', String(plan.estimatedDofs)],
    ['Boundary edges', String(plan.boundarySegmentCount)],
    ['Characteristic length min / median / max', [
      plan.characteristicLengthMin,
      plan.characteristicLengthMedian,
      plan.characteristicLengthMax,
    ].map((value) => value.toPrecision(4)).join(' / ')],
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
      'This strategy triangulates the boundary polygon and inserts no interior nodes, so refining the target length produces more sliver elements rather than a better mesh. Expect the mesh-quality gates to report WARNING or BLOCK. A four-sided region meshed as Q8 uses the mapped strategy instead.',
    ));
  }
  return summary;
}
