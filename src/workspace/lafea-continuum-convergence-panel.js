/** Engineer-facing setup for the governed LAFEA.3 physical-point convergence study. */
import { element } from './lafea-workbench-dom.js';

const STAGE_ID = 'LAFEA.3';
const REQUEST_SCHEMA = 'lafea-continuum-convergence-study-request/v1';
const PROBE_SCHEMA = 'lafea-continuum-physical-probe/v1';
const DISPLACEMENT_QUANTITIES = Object.freeze([
  ['DISPLACEMENT_MAGNITUDE', 'Displacement magnitude'],
  ['DISPLACEMENT_X', 'Displacement X'],
  ['DISPLACEMENT_Y', 'Displacement Y'],
]);

export function renderLafeaContinuumConvergencePanel(root, stage, options = {}) {
  const panel = element(root, 'div', 'lafea-continuum-convergence-panel');
  panel.dataset.role = 'lafea-continuum-convergence-panel';

  if (stage?.stageId !== STAGE_ID || stage.domainFirstProfileActive !== true) {
    panel.dataset.state = 'NOT_APPLICABLE';
    panel.append(element(root, 'p', null, 'Convergence study setup is not applicable to this stage.'));
    return panel;
  }
  if (stage.execution?.status !== 'QUALIFIED') {
    panel.dataset.state = 'EXECUTION_REQUIRED';
    panel.append(element(root, 'p', null, 'Run a qualified analysis before defining the convergence study.'));
    return panel;
  }

  const supportedCases = (stage.execution.canonicalInput?.loadCases ?? []).filter(
    (row) => typeof row?.loadCaseId === 'string'
      && (!Array.isArray(row.temperatureLoads) || row.temperatureLoads.length === 0),
  );
  if (!supportedCases.length) {
    panel.dataset.state = 'NO_SUPPORTED_LOAD_CASE';
    panel.append(element(
      root,
      'p',
      null,
      'No current physical load case is eligible for point-probe convergence. Temperature-loaded cases remain outside this probe authority.',
    ));
    return panel;
  }

  panel.dataset.state = stage.continuumConvergenceProjection?.state ?? 'ABSENT';
  panel.append(element(
    root,
    'p',
    'lafea-workbench__section-intro',
    'Define the physical probe and coarse mesh size explicitly. The governed publication policy fixes a three-level 2:1 ladder; no acceptance tolerance is editable here.',
  ));

  const form = element(root, 'form', 'lafea-continuum-convergence-panel__form');
  const studyId = input(root, form, 'Study ID', 'text', 'studyId');
  studyId.required = true;
  studyId.placeholder = 'e.g. nozzle-root-displacement';

  const loadCase = select(root, form, 'Physical load case', 'loadCaseId', supportedCases.map(
    (row) => [row.loadCaseId, row.loadCaseId],
  ));
  const quantity = select(root, form, 'Probe quantity', 'quantityId', DISPLACEMENT_QUANTITIES);
  const x = input(root, form, 'Probe X (mm)', 'number', 'probeX');
  const y = input(root, form, 'Probe Y (mm)', 'number', 'probeY');
  const coarseH = input(root, form, 'Coarse target size h (mm)', 'number', 'coarseH');
  for (const field of [x, y, coarseH]) field.required = true;
  x.step = 'any';
  y.step = 'any';
  coarseH.step = 'any';
  coarseH.min = '0';

  const ladder = element(root, 'p', 'lafea-continuum-convergence-panel__ladder');
  ladder.dataset.role = 'lafea-convergence-ladder-preview';
  const refreshLadder = () => {
    const h = Number(coarseH.value);
    ladder.textContent = Number.isFinite(h) && h > 0
      ? `Mesh ladder: ${h} mm → ${h / 2} mm → ${h / 4} mm`
      : 'Mesh ladder: enter a positive coarse target size.';
  };
  coarseH.oninput = refreshLadder;
  refreshLadder();
  form.append(ladder);

  const submit = element(root, 'button', 'lafea-next-action-banner__button', 'Run convergence study');
  submit.type = 'submit';
  submit.disabled = typeof options.onRunConvergence !== 'function';
  submit.title = submit.disabled
    ? 'The convergence execution handler is not available.'
    : 'Run the governed three-level study. Solver, probe and convergence acceptance remain under existing production authority.';
  const feedback = element(root, 'p', 'lafea-continuum-convergence-panel__feedback');
  feedback.dataset.role = 'lafea-convergence-feedback';
  form.append(submit, feedback);

  form.onsubmit = (event) => {
    event.preventDefault();
    const h = Number(coarseH.value);
    const px = Number(x.value);
    const py = Number(y.value);
    if (!(Number.isFinite(h) && h > 0 && Number.isFinite(px) && Number.isFinite(py))) {
      feedback.textContent = 'Enter finite probe coordinates and a positive coarse target size.';
      return;
    }
    const id = studyId.value.trim();
    if (!id) {
      feedback.textContent = 'Study ID is required.';
      return;
    }
    const request = {
      schema: REQUEST_SCHEMA,
      studyId: id,
      probe: {
        schema: PROBE_SCHEMA,
        probeId: `${id}/probe`,
        physicalCoordinate: { x: px, y: py },
        coordinateFrame: 'GLOBAL_XY',
        loadCaseId: loadCase.value,
        quantityId: quantity.value,
        representation: 'PHYSICAL_POINT_DIRECT',
        recoveryMethod: 'ELEMENT_SHAPE_INTERPOLATION',
        units: 'mm',
        singularityClassification: 'NOT_APPLICABLE',
      },
      levels: [
        { levelId: 'COARSE', h },
        { levelId: 'MEDIUM', h: h / 2 },
        { levelId: 'FINE', h: h / 4 },
      ],
    };
    feedback.textContent = 'Running governed convergence study…';
    try {
      const result = options.onRunConvergence(request);
      feedback.textContent = result?.status === 'CURRENT_PASS'
        ? 'Convergence evidence is current and qualifies Results publication.'
        : `Convergence study retained with status ${result?.status ?? 'UNKNOWN'}.`;
    } catch (error) {
      feedback.textContent = `Convergence study failed: ${error?.code ?? error?.message ?? 'UNKNOWN_ERROR'}`;
    }
  };

  panel.append(form);
  return panel;
}

function input(root, form, labelText, type, name) {
  const label = element(root, 'label', 'lafea-continuum-convergence-panel__field');
  label.append(element(root, 'span', null, labelText));
  const control = element(root, 'input');
  control.type = type;
  control.name = name;
  label.append(control);
  form.append(label);
  return control;
}

function select(root, form, labelText, name, options) {
  const label = element(root, 'label', 'lafea-continuum-convergence-panel__field');
  label.append(element(root, 'span', null, labelText));
  const control = element(root, 'select');
  control.name = name;
  for (const [value, text] of options) {
    const option = element(root, 'option', null, text);
    option.value = value;
    control.append(option);
  }
  label.append(control);
  form.append(label);
  return control;
}
