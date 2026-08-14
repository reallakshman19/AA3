/** Interactive left-side LAFEA analysis workflow.
 *
 * The panel creates a bounded LAFEA.3 starter source through the normal import
 * boundary, binds the existing governed mesh-profile contract, generates the
 * retained analysis mesh, and renders a read-only SVG projection of that exact
 * retained mesh. It does not create solver, mesh, or release authority itself.
 */
import {
  FORMULATIONS,
  MODEL_SCHEMA,
  QUALIFICATION_PROFILE,
} from '../core/local-continuum/index.js';
import {
  PROFILE_KINDS,
  defaultProfileFields,
} from '../core/lafea-profile-contract/index.js';
import { lafeaWorkbenchReasonLabels } from './lafea-workbench-reason-labels.js';

const STYLE_ID = 'lafea-analysis-workflow-panel-style';
const PROFILE_SOURCE_REVISION = 'lafea-discretization-ui-mesh-profile/v1';
const SHELL_ELEMENT_PLACEHOLDER = 'CST_DKT_TRI3_THIN_SHELL_V1';
const SVG_WIDTH = 270;
const SVG_HEIGHT = 170;
const SVG_PADDING = 12;

export function renderLafeaAnalysisWorkflowPanel(root, input) {
  if (!root?.ownerDocument || !input?.workflow || !input?.stage || !input?.discretization) {
    throw new TypeError('LAFEA_ANALYSIS_WORKFLOW_PANEL_INPUT_REQUIRED');
  }
  ensureStyles(root.ownerDocument);
  const doc = root.ownerDocument;
  const host = doc.createElement('aside');
  host.className = 'lafea-analysis-workflow-panel';
  host.dataset.role = 'lafea-analysis-workflow-panel';
  host.dataset.stageId = input.workflow.stageId;

  const heading = doc.createElement('header');
  heading.className = 'lafea-analysis-workflow-panel__heading';
  const eyebrow = doc.createElement('span');
  eyebrow.textContent = 'Analysis workflow';
  const title = doc.createElement('h2');
  title.textContent = input.workflow.stageId === 'LAFEA.3'
    ? '2D continuum setup'
    : `${input.workflow.stageId} workflow`;
  const subtitle = doc.createElement('p');
  subtitle.textContent = 'Enter the model, generate the mesh, validate, then run.';
  heading.append(eyebrow, title, subtitle);
  host.append(heading);

  if (input.workflow.stageId !== 'LAFEA.3') {
    const switcher = doc.createElement('section');
    switcher.className = 'lafea-analysis-workflow-panel__callout';
    switcher.append(text(doc, 'strong', 'Need a meshed 2D model?'));
    switcher.append(text(doc, 'p', 'The interactive model + mesh workflow is available on LAFEA.3.'));
    const button = action(doc, 'Open LAFEA.3 2D continuum', () => input.handlers?.onStage?.('LAFEA.3'));
    button.dataset.role = 'lafea-left-open-continuum';
    switcher.append(button);
    host.append(switcher);
  }

  host.append(stepNavigator(doc, input.workflow, input.onNavigate));
  host.append(sourceSection(doc, input));
  host.append(meshSection(doc, input));
  host.append(runSection(doc, input));

  const release = text(
    doc,
    'p',
    `Release authority: ${input.workflow.releaseQualified ? 'QUALIFIED' : 'NOT QUALIFIED'}`,
  );
  release.className = 'lafea-analysis-workflow-panel__release';
  host.append(release);
  root.replaceChildren(host);
  return host;
}

function stepNavigator(doc, workflow, onNavigate) {
  const nav = doc.createElement('nav');
  nav.className = 'lafea-analysis-workflow-panel__steps';
  nav.setAttribute('aria-label', 'LAFEA analysis workflow steps');
  const list = doc.createElement('ol');
  workflow.steps.forEach((step, index) => {
    const item = doc.createElement('li');
    item.dataset.status = step.status;
    const button = action(doc, `${index + 1}. ${step.label}`, () => onNavigate?.(step));
    button.dataset.guidedStep = step.stepId;
    button.dataset.status = step.status;
    const badge = text(doc, 'span', step.status);
    badge.className = 'lafea-analysis-workflow-panel__step-status';
    button.append(badge);
    if (step.reasons.length) {
      const reasons = lafeaWorkbenchReasonLabels(step.reasons).join(' • ');
      button.title = reasons;
      if (step.status === 'BLOCKED' || step.status === 'WARNING') {
        const note = text(doc, 'small', reasons);
        note.className = 'lafea-analysis-workflow-panel__step-reason';
        item.append(button, note);
      } else {
        item.append(button);
      }
    } else {
      item.append(button);
    }
    list.append(item);
  });
  nav.append(list);
  return nav;
}

function sourceSection(doc, input) {
  const details = disclosure(doc, '1 · Model input', input.workflow.stageId === 'LAFEA.3');
  details.dataset.role = 'lafea-left-model-input';
  const body = details.querySelector('div');

  const fileLabel = text(doc, 'label', 'Import stage JSON');
  fileLabel.className = 'lafea-analysis-workflow-panel__file';
  const file = doc.createElement('input');
  file.type = 'file';
  file.accept = '.json,application/json';
  file.dataset.role = 'lafea-left-import-json';
  file.addEventListener('change', () => input.handlers?.onFile?.(file.files?.[0] ?? null));
  fileLabel.append(file);
  body.append(fileLabel);

  if (input.workflow.stageId !== 'LAFEA.3') {
    body.append(text(doc, 'p', 'Select LAFEA.3 for structured geometry, material, restraint and load inputs.'));
    return details;
  }

  const form = doc.createElement('form');
  form.className = 'lafea-analysis-workflow-panel__form';
  form.dataset.role = 'lafea-left-continuum-form';
  const initial = deriveContinuumInput(input.stage.document);
  const modelIdentity = field(doc, 'Model name', 'text', initial.modelIdentity, 'lafea-left-model-name');
  const formulation = select(doc, 'Formulation', [
    [FORMULATIONS.PLANE_STRESS, 'Plane stress'],
    [FORMULATIONS.PLANE_STRAIN, 'Plane strain'],
  ], initial.formulation, 'lafea-left-formulation');
  const width = field(doc, 'Width', 'number', initial.width, 'lafea-left-width', { min: 0.000001 });
  const height = field(doc, 'Height', 'number', initial.height, 'lafea-left-height', { min: 0.000001 });
  const thickness = field(doc, 'Thickness', 'number', initial.thickness, 'lafea-left-thickness', { min: 0.000001 });
  const modulus = field(doc, 'Elastic modulus', 'number', initial.elasticModulus, 'lafea-left-modulus', { min: 0.000001 });
  const poisson = field(doc, 'Poisson ratio', 'number', initial.poissonRatio, 'lafea-left-poisson', { step: 'any' });
  const forceX = field(doc, 'Total Fx', 'number', initial.forceX, 'lafea-left-force-x', { step: 'any' });
  const forceY = field(doc, 'Total Fy', 'number', initial.forceY, 'lafea-left-force-y', { step: 'any' });
  const restraints = select(doc, 'Restraint preset', [
    ['LEFT_EDGE', 'Left edge · A fixed + D X'],
    ['BOTTOM_EDGE', 'Bottom edge · A fixed + B Y'],
  ], initial.restraintPreset, 'lafea-left-restraints');
  const units = text(doc, 'p', 'Units: mm · N · MPa. Loads are split equally over the two opposite-edge nodes.');
  units.className = 'lafea-analysis-workflow-panel__hint';
  const error = doc.createElement('output');
  error.className = 'lafea-analysis-workflow-panel__error';
  error.setAttribute('aria-live', 'polite');

  const submit = action(doc, input.stage.document ? 'Apply model inputs' : 'Create model', () => {});
  submit.type = 'submit';
  submit.dataset.role = 'lafea-left-create-model';
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    error.textContent = '';
    try {
      const values = {
        modelIdentity: modelIdentity.input.value.trim(),
        formulation: formulation.input.value,
        width: finitePositive(width.input.value, 'Width'),
        height: finitePositive(height.input.value, 'Height'),
        thickness: finitePositive(thickness.input.value, 'Thickness'),
        elasticModulus: finitePositive(modulus.input.value, 'Elastic modulus'),
        poissonRatio: finiteNumber(poisson.input.value, 'Poisson ratio'),
        forceX: finiteNumber(forceX.input.value, 'Total Fx'),
        forceY: finiteNumber(forceY.input.value, 'Total Fy'),
        restraintPreset: restraints.input.value,
      };
      if (!values.modelIdentity) throw new TypeError('Model name is required.');
      if (!(values.poissonRatio > -1 && values.poissonRatio < 0.5)) {
        throw new TypeError('Poisson ratio must be greater than -1 and less than 0.5.');
      }
      input.handlers?.onCreateDocument?.(buildContinuumDocument(values), 'LAFEA.3');
    } catch (cause) {
      error.textContent = cause instanceof Error ? cause.message : 'Model input is invalid.';
    }
  });

  form.append(
    modelIdentity.label,
    formulation.label,
    grid(doc, [width.label, height.label, thickness.label]),
    grid(doc, [modulus.label, poisson.label]),
    grid(doc, [forceX.label, forceY.label]),
    restraints.label,
    units,
    error,
    submit,
  );
  body.append(form);
  return details;
}

function meshSection(doc, input) {
  const details = disclosure(doc, '2 · Mesh + SVG', input.workflow.stageId === 'LAFEA.3');
  details.dataset.role = 'lafea-left-mesh-settings';
  const body = details.querySelector('div');
  if (input.workflow.stageId !== 'LAFEA.3') {
    body.append(text(doc, 'p', 'Automatic continuum meshing is wired on LAFEA.3.'));
    return details;
  }

  const generation = input.discretization.generation;
  if (!generation.producerQualified) {
    body.append(text(doc, 'p', 'No qualified automatic mesh producer is bound for this stage.'));
    return details;
  }

  const familyValues = generation.elementFamilies.map((value) => [value, value]);
  const preferredFamily = generation.declaredElementFamily
    ?? (generation.elementFamilies.includes('T6') ? 'T6' : generation.elementFamilies[0] ?? '');
  const family = select(doc, 'Element family', familyValues, preferredFamily, 'lafea-left-mesh-family');
  const target = field(
    doc,
    `Target element size${generation.lengthUnit ? ` (${generation.lengthUnit})` : ''}`,
    'number',
    Number.isFinite(generation.targetElementLength) ? generation.targetElementLength : 25,
    'lafea-left-mesh-target',
    { min: 0.000001 },
  );
  const actions = doc.createElement('div');
  actions.className = 'lafea-analysis-workflow-panel__actions';
  const plan = action(doc, 'Plan', () => runMeshAction(input, family.input.value, target.input.value, 'PLAN'));
  plan.dataset.role = 'lafea-left-plan-mesh';
  plan.disabled = !input.stage.document;
  const generate = action(doc, 'Generate SVG mesh', () => runMeshAction(input, family.input.value, target.input.value, 'GENERATE'));
  generate.dataset.role = 'lafea-left-generate-mesh';
  generate.disabled = !input.stage.document;
  actions.append(plan, generate);

  const state = text(
    doc,
    'p',
    `Custody: ${input.discretization.state} · ${input.discretization.evidence.nodeCount ?? 0} nodes · ${input.discretization.evidence.elementCount ?? 0} elements`,
  );
  state.className = 'lafea-analysis-workflow-panel__mesh-state';
  const svgHost = doc.createElement('div');
  svgHost.className = 'lafea-analysis-workflow-panel__mesh-svg';
  svgHost.dataset.role = 'lafea-left-mesh-svg';
  renderRetainedMeshSvg(doc, svgHost, retainedMeshEvidence(input.stage));
  body.append(family.label, target.label, actions, state, svgHost);
  return details;
}

function runSection(doc, input) {
  const details = disclosure(doc, '3 · Validate + run', true);
  details.dataset.role = 'lafea-left-run-controls';
  const body = details.querySelector('div');
  const actions = doc.createElement('div');
  actions.className = 'lafea-analysis-workflow-panel__actions';
  const meshPresent = Boolean(retainedMeshEvidence(input.stage)?.mesh);
  const prepare = action(doc, 'Prepare / validate', () => input.handlers?.onPrepare?.());
  prepare.dataset.role = 'lafea-left-prepare';
  prepare.disabled = input.workflow.stageId !== 'LAFEA.3' || !input.stage.document || !meshPresent;
  const run = action(doc, 'Run analysis', () => input.handlers?.onRun?.());
  run.dataset.role = 'lafea-left-run';
  run.disabled = !input.workflow.runEligibleByCurrentUiGate;
  actions.append(prepare, run);
  const status = text(
    doc,
    'p',
    input.workflow.runEligibleByCurrentUiGate
      ? 'Authorization READY — analysis can run.'
      : 'Run remains disabled until source, mesh and canonical preparation are current.',
  );
  status.className = 'lafea-analysis-workflow-panel__hint';
  body.append(actions, status);
  return details;
}

function runMeshAction(input, family, rawTarget, mode) {
  const target = finitePositive(rawTarget, 'Target element size');
  if (!input.discretization.generation.elementFamilies.includes(family)) {
    throw new TypeError('Select an authorized element family.');
  }
  const generation = input.discretization.generation;
  const sameProfile = generation.meshProfileBound
    && generation.declaredElementFamily === family
    && generation.targetElementLength === target;
  if (!sameProfile) input.handlers?.onBindMeshProfile?.(meshProfile(family, target));
  if (mode === 'PLAN') input.handlers?.onPlanMesh?.({});
  else input.handlers?.onGenerateMesh?.({});
}

function meshProfile(family, targetElementLength) {
  const defaults = defaultProfileFields(PROFILE_KINDS.MESH);
  return {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity: `LAFEA3_UI_${family}_MESH_PROFILE_V1`,
    sourceRevision: PROFILE_SOURCE_REVISION,
    semanticHash: undefined,
    fields: {
      continuumElement: family,
      shellElement: SHELL_ELEMENT_PLACEHOLDER,
      globalTargetSize: targetElementLength,
      adjacentSizeRatioMax: defaults.adjacentSizeRatioMax,
      aspectRatioWarn: defaults.aspectRatioWarn,
      aspectRatioBlock: defaults.aspectRatioBlock,
      scaledJacobianWarn: defaults.scaledJacobianWarn,
      scaledJacobianBlock: defaults.scaledJacobianBlock,
      adaptiveLevels: defaults.adaptiveLevels,
    },
  };
}

function buildContinuumDocument(value) {
  const width = value.width;
  const height = value.height;
  const rightFx = value.forceX / 2;
  const rightFy = value.forceY / 2;
  const constraints = value.restraintPreset === 'BOTTOM_EDGE'
    ? [constraint('C1', 'A', 'UX'), constraint('C2', 'A', 'UY'), constraint('C3', 'B', 'UY')]
    : [constraint('C1', 'A', 'UX'), constraint('C2', 'A', 'UY'), constraint('C3', 'D', 'UX')];
  return {
    schema: MODEL_SCHEMA,
    modelIdentity: value.modelIdentity,
    modelVersion: '1',
    sourceAncestry: {
      sourceModelIdentity: value.modelIdentity,
      sourceVersion: '1',
      adapterIdentity: 'LAFEA3_UI_QUICK_INPUT',
      adapterVersion: '1',
    },
    units: { length: 'mm', force: 'N', stress: 'MPa', modulus: 'MPa' },
    formulation: value.formulation,
    materials: [{
      materialId: 'MAT',
      elasticModulus: value.elasticModulus,
      poissonRatio: value.poissonRatio,
      sourceReference: 'USER_INPUT#MATERIAL',
    }],
    nodes: [
      node('A', 0, 0),
      node('B', width, 0),
      node('C', width, height),
      node('D', 0, height),
    ],
    elements: [
      element('E1', ['A', 'B', 'D'], value.thickness),
      element('E2', ['B', 'C', 'D'], value.thickness),
    ],
    elementTypePolicy: { allowT3Fallback: true, sourceReference: 'USER_INPUT#ELEMENT_POLICY' },
    constraints,
    loadCases: [{
      loadCaseId: 'USER_LOAD',
      nodalForces: [
        force('F1', 'B', rightFx, rightFy),
        force('F2', 'C', rightFx, rightFy),
      ],
      edgeTractions: [],
      pressureLoads: [],
      bodyForces: [],
      temperatureLoads: [],
      imposedDisplacements: [],
      sourceReference: 'USER_INPUT#LOAD_CASE',
    }],
    resultRequests: { loadCaseIds: ['USER_LOAD'] },
    qualificationProfile: structuredClone(QUALIFICATION_PROFILE),
    limitations: [],
  };
}

function deriveContinuumInput(documentValue) {
  const document = documentValue && typeof documentValue === 'object' ? documentValue : null;
  const nodes = Array.isArray(document?.nodes) ? document.nodes : [];
  const xs = nodes.map((row) => row?.x).filter(Number.isFinite);
  const ys = nodes.map((row) => row?.y).filter(Number.isFinite);
  const material = Array.isArray(document?.materials) ? document.materials[0] : null;
  const element = Array.isArray(document?.elements) ? document.elements[0] : null;
  const loadCase = Array.isArray(document?.loadCases) ? document.loadCases[0] : null;
  const forces = Array.isArray(loadCase?.nodalForces) ? loadCase.nodalForces : [];
  return {
    modelIdentity: typeof document?.modelIdentity === 'string' ? document.modelIdentity : 'RECTANGLE_2D',
    formulation: document?.formulation === FORMULATIONS.PLANE_STRAIN
      ? FORMULATIONS.PLANE_STRAIN
      : FORMULATIONS.PLANE_STRESS,
    width: xs.length ? Math.max(...xs) - Math.min(...xs) : 100,
    height: ys.length ? Math.max(...ys) - Math.min(...ys) : 50,
    thickness: Number.isFinite(element?.thickness) ? element.thickness : 10,
    elasticModulus: Number.isFinite(material?.elasticModulus) ? material.elasticModulus : 200000,
    poissonRatio: Number.isFinite(material?.poissonRatio) ? material.poissonRatio : 0.3,
    forceX: forces.reduce((sum, row) => sum + (Number.isFinite(row?.fx) ? row.fx : 0), 0) || 1000,
    forceY: forces.reduce((sum, row) => sum + (Number.isFinite(row?.fy) ? row.fy : 0), 0),
    restraintPreset: 'LEFT_EDGE',
  };
}

function retainedMeshEvidence(stage) {
  return stage?.domainFirstProfileActive === true || stage?.shellMidsurfaceProfileActive === true
    ? stage.retainedAnalysisMeshEvidenceV2 ?? null
    : stage?.retainedAnalysisMeshEvidence ?? null;
}

function renderRetainedMeshSvg(doc, host, evidence) {
  const mesh = evidence?.mesh;
  const nodes = Array.isArray(mesh?.nodes) ? mesh.nodes : [];
  const elements = Array.isArray(mesh?.elements) ? mesh.elements : [];
  if (!nodes.length || !elements.length) {
    host.replaceChildren(text(doc, 'p', 'No retained mesh yet. Choose family + size, then Generate SVG mesh.'));
    return;
  }
  const coordinates = nodes.map((row) => ({
    id: String(row?.nodeId ?? row?.id ?? row?.identity ?? ''),
    x: coordinate(row, 'x'),
    y: coordinate(row, 'y'),
  })).filter((row) => row.id && Number.isFinite(row.x) && Number.isFinite(row.y));
  if (!coordinates.length) {
    host.replaceChildren(text(doc, 'p', 'Retained mesh coordinates are unavailable for SVG projection.'));
    return;
  }
  const xMin = Math.min(...coordinates.map((row) => row.x));
  const xMax = Math.max(...coordinates.map((row) => row.x));
  const yMin = Math.min(...coordinates.map((row) => row.y));
  const yMax = Math.max(...coordinates.map((row) => row.y));
  const xSpan = Math.max(xMax - xMin, 1e-9);
  const ySpan = Math.max(yMax - yMin, 1e-9);
  const map = new Map(coordinates.map((row) => [row.id, {
    x: SVG_PADDING + ((row.x - xMin) / xSpan) * (SVG_WIDTH - 2 * SVG_PADDING),
    y: SVG_HEIGHT - SVG_PADDING - ((row.y - yMin) / ySpan) * (SVG_HEIGHT - 2 * SVG_PADDING),
  }]));
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Retained analysis mesh with ${nodes.length} nodes and ${elements.length} elements`);
  svg.dataset.role = 'lafea-left-retained-mesh-svg';
  elements.forEach((row) => {
    const ids = elementCornerIds(row);
    const points = ids.map((id) => map.get(String(id))).filter(Boolean);
    if (points.length < 3) return;
    const polygon = doc.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', points.map((point) => `${point.x},${point.y}`).join(' '));
    polygon.setAttribute('data-element-id', String(row?.elementId ?? row?.id ?? ''));
    polygon.setAttribute('class', 'lafea-analysis-workflow-panel__mesh-element');
    svg.append(polygon);
  });
  coordinates.forEach((row) => {
    const point = map.get(row.id);
    const circle = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', String(point.x));
    circle.setAttribute('cy', String(point.y));
    circle.setAttribute('r', '1.7');
    circle.setAttribute('class', 'lafea-analysis-workflow-panel__mesh-node');
    svg.append(circle);
  });
  const caption = text(doc, 'p', `${elements.length} elements · ${nodes.length} nodes · retained mesh`);
  caption.className = 'lafea-analysis-workflow-panel__mesh-caption';
  host.replaceChildren(svg, caption);
}

function elementCornerIds(row) {
  const ids = Array.isArray(row?.nodeIds) ? row.nodeIds : Array.isArray(row?.nodes) ? row.nodes : [];
  const family = String(row?.elementType ?? row?.type ?? '').toUpperCase();
  if (family.includes('Q8')) return ids.slice(0, 4);
  if (family.includes('T6') || family.includes('T3')) return ids.slice(0, 3);
  return ids.slice(0, Math.min(ids.length, 4));
}
function coordinate(row, axis) {
  if (Number.isFinite(row?.[axis])) return row[axis];
  if (Number.isFinite(row?.position?.[axis])) return row.position[axis];
  return null;
}
function node(nodeId, x, y) { return { nodeId, x, y, sourceReference: `USER_INPUT#NODE:${nodeId}` }; }
function element(elementId, nodeIds, thickness) {
  return { elementId, elementType: 'T3', nodeIds, materialId: 'MAT', thickness, sourceReference: `USER_INPUT#ELEMENT:${elementId}` };
}
function constraint(constraintId, nodeId, dof) {
  return { constraintId, nodeId, dof, value: 0, sourceReference: `USER_INPUT#CONSTRAINT:${constraintId}` };
}
function force(loadId, nodeId, fx, fy) {
  return { loadId, nodeId, fx, fy, sourceReference: `USER_INPUT#FORCE:${loadId}` };
}
function field(doc, labelText, type, value, role, options = {}) {
  const label = doc.createElement('label');
  label.className = 'lafea-analysis-workflow-panel__field';
  label.append(text(doc, 'span', labelText));
  const input = doc.createElement('input');
  input.type = type;
  input.value = String(value ?? '');
  input.dataset.role = role;
  if (options.min !== undefined) input.min = String(options.min);
  input.step = options.step ?? (type === 'number' ? 'any' : '');
  label.append(input);
  return { label, input };
}
function select(doc, labelText, options, selected, role) {
  const label = doc.createElement('label');
  label.className = 'lafea-analysis-workflow-panel__field';
  label.append(text(doc, 'span', labelText));
  const input = doc.createElement('select');
  input.dataset.role = role;
  options.forEach(([value, caption]) => {
    const option = doc.createElement('option');
    option.value = value;
    option.textContent = caption;
    option.selected = value === selected;
    input.append(option);
  });
  label.append(input);
  return { label, input };
}
function disclosure(doc, title, open) {
  const details = doc.createElement('details');
  details.className = 'lafea-analysis-workflow-panel__section';
  details.open = open;
  details.append(text(doc, 'summary', title));
  const body = doc.createElement('div');
  body.className = 'lafea-analysis-workflow-panel__section-body';
  details.append(body);
  return details;
}
function grid(doc, children) {
  const host = doc.createElement('div');
  host.className = 'lafea-analysis-workflow-panel__field-grid';
  host.append(...children);
  return host;
}
function action(doc, label, listener) {
  const button = doc.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', listener);
  return button;
}
function text(doc, tagName, value) {
  const node = doc.createElement(tagName);
  node.textContent = String(value);
  return node;
}
function finitePositive(raw, label) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) throw new TypeError(`${label} must be greater than zero.`);
  return value;
}
function finiteNumber(raw, label) {
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new TypeError(`${label} must be finite.`);
  return value;
}
function ensureStyles(doc) {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .lafea-analysis-workflow-panel{display:grid;gap:10px;min-width:0;padding:14px;border:1px solid #2a3d54;border-radius:10px;background:#0a1422;color:#e7eef8}
    .lafea-analysis-workflow-panel__heading span{color:#38bdf8;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.lafea-analysis-workflow-panel__heading h2{margin:3px 0 4px;font-size:20px}.lafea-analysis-workflow-panel__heading p{margin:0;color:#96a9be;font-size:12px;line-height:1.4}
    .lafea-analysis-workflow-panel__callout{display:grid;gap:7px;padding:10px;border:1px solid #8a640c;border-radius:7px;background:#211a08}.lafea-analysis-workflow-panel__callout p{margin:0;color:#d5c38e;font-size:11px}
    .lafea-analysis-workflow-panel__steps ol{display:grid;gap:4px;margin:0;padding:0;list-style:none}.lafea-analysis-workflow-panel__steps li{min-width:0}.lafea-analysis-workflow-panel__steps button{display:grid!important;grid-template-columns:minmax(0,1fr) auto;gap:6px;width:100%;padding:7px 8px!important;text-align:left!important;font-size:11px}.lafea-analysis-workflow-panel__step-status{font-size:9px;color:#8da3b9}.lafea-analysis-workflow-panel__steps li[data-status="COMPLETE"] .lafea-analysis-workflow-panel__step-status,.lafea-analysis-workflow-panel__steps li[data-status="READY"] .lafea-analysis-workflow-panel__step-status{color:#86efac}.lafea-analysis-workflow-panel__steps li[data-status="BLOCKED"] .lafea-analysis-workflow-panel__step-status{color:#fca5a5}.lafea-analysis-workflow-panel__step-reason{display:block;margin:2px 4px 5px;color:#8498ae;font-size:9px;line-height:1.3}
    .lafea-analysis-workflow-panel__section{border:1px solid #263a50;border-radius:7px;background:#07111d}.lafea-analysis-workflow-panel__section>summary{cursor:pointer;padding:9px 10px;color:#d8e8f7;font-weight:800;font-size:12px}.lafea-analysis-workflow-panel__section-body{display:grid;gap:8px;padding:0 10px 10px}.lafea-analysis-workflow-panel__section-body>p{margin:0;color:#96a9be;font-size:11px;line-height:1.4}
    .lafea-analysis-workflow-panel__form{display:grid;gap:8px}.lafea-analysis-workflow-panel__field{display:grid;gap:4px;min-width:0;color:#b7c6d6;font-size:10px}.lafea-analysis-workflow-panel__field input,.lafea-analysis-workflow-panel__field select{width:100%;box-sizing:border-box;padding:7px!important;font-size:12px}.lafea-analysis-workflow-panel__field-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.lafea-analysis-workflow-panel__field-grid:has(> :nth-child(3)){grid-template-columns:repeat(3,minmax(0,1fr))}
    .lafea-analysis-workflow-panel__hint,.lafea-analysis-workflow-panel__mesh-state,.lafea-analysis-workflow-panel__mesh-caption{margin:0;color:#8498ae;font-size:10px;line-height:1.35}.lafea-analysis-workflow-panel__error{min-height:0;color:#fca5a5;font-size:10px}.lafea-analysis-workflow-panel__actions{display:flex;gap:6px;flex-wrap:wrap}.lafea-analysis-workflow-panel__actions button,.lafea-analysis-workflow-panel__form>button{font-weight:700}.lafea-analysis-workflow-panel [data-role="lafea-left-generate-mesh"],.lafea-analysis-workflow-panel [data-role="lafea-left-run"]{background:#0f766e;border-color:#2dd4bf;color:#ecfeff}
    .lafea-analysis-workflow-panel__mesh-svg{display:grid;gap:5px;min-height:120px;padding:7px;border:1px solid #26394d;border-radius:6px;background:#040a12}.lafea-analysis-workflow-panel__mesh-svg>p{align-self:center;margin:0;text-align:center;color:#74879c;font-size:10px}.lafea-analysis-workflow-panel__mesh-svg svg{display:block;width:100%;height:auto;max-height:180px}.lafea-analysis-workflow-panel__mesh-element{fill:rgba(56,189,248,.08);stroke:#60a5fa;stroke-width:.75}.lafea-analysis-workflow-panel__mesh-node{fill:#dbeafe}.lafea-analysis-workflow-panel__file{display:grid;gap:4px;color:#b7c6d6;font-size:10px}.lafea-analysis-workflow-panel__file input{width:100%;box-sizing:border-box;font-size:10px}.lafea-analysis-workflow-panel__release{margin:0;padding-top:8px;border-top:1px solid #24384e;color:#8ea2b7;font-size:10px}
    @media(max-width:1100px){.lafea-analysis-workflow-panel__field-grid,.lafea-analysis-workflow-panel__field-grid:has(> :nth-child(3)){grid-template-columns:1fr}}
  `;
  (doc.head ?? doc.documentElement).append(style);
}
