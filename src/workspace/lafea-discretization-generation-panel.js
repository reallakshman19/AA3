/** Automatic mesh-generation controls for the Discretization surface. */
import { button, node, region } from './lafea-discretization-dom.js';

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

