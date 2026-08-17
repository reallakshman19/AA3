/**
 * Accessible LAFEA result presentation boundary.
 *
 * Stage presenters may display only retained result fields. Raw evidence is an
 * advanced audit view and is not blanket-labelled as qualified numerical truth.
 */
import {
  presentLafeaResult,
  resolveLafeaUnits,
} from './lafea-result-presenters/index.js';
import { renderLafeaShellResult } from './lafea-result-svg.js';

export function renderLafeaEvidence(root, stageId, documentValue, state, execution) {
  const wrapper = create(root, 'div', 'lafea-workbench__evidence');
  const diagnostics = state.diagnostics?.length ? state.diagnostics : execution?.diagnostics ?? [];
  if (diagnostics.length) wrapper.append(diagnosticsView(root, diagnostics));

  if (!execution) {
    wrapper.append(emptyResultState(root, stageId));
    return wrapper;
  }

  const accepted = execution.status === 'QUALIFIED';
  wrapper.append(create(
    root,
    'p',
    'lafea-workbench__authority',
    accepted
      ? 'Analysis completed. Retained result evidence is accepted by the current stage result contract.'
      : 'No authoritative result is available for this execution.',
  ));

  if (accepted && execution.result) {
    const units = resolveLafeaUnits(stageId, documentValue);
    const highlights = buildEngineeringHighlights(
      stageId,
      execution.result,
      documentValue?.units ?? units,
    );
    if (highlights) wrapper.append(engineeringHighlightsView(root, highlights));
    const presentation = presentLafeaResult(stageId, execution.result, units);
    wrapper.append(presentationView(root, presentation));
    if (stageId === 'LAFEA.4') {
      const plot = create(root, 'div', 'lafea-workbench__result-plot');
      renderLafeaShellResult(plot, documentValue, execution.result, units);
      wrapper.append(plot);
    }
  }

  if (execution.result) wrapper.append(rawEvidence(root, execution.result));
  return wrapper;
}

function emptyResultState(root, stageId) {
  const analytical = stageId === 'LAFEA.1' || stageId === 'LAFEA.2';
  const section = create(root, 'section', 'lafea-result-empty');
  section.dataset.role = 'lafea-result-empty';
  section.append(
    create(root, 'strong', null, 'No analysis result yet'),
    create(root, 'p', null, analytical
      ? 'Complete the required analytical inputs and authorization, then calculate. Retained resultants and stresses will appear here; no FE mesh is required for this stage.'
      : 'Complete the model, mesh and authorization gates, then run the registered analysis. Computed displacements, stresses, reactions and energy will appear here.'),
  );
  return section;
}

function engineeringHighlightsView(root, model) {
  const section = create(root, 'section', 'lafea-result-highlights');
  section.dataset.role = 'lafea-result-highlights';
  const heading = create(root, 'div', 'lafea-result-highlights__heading');
  heading.append(
    create(root, 'div', null, undefined),
    create(root, 'strong', 'lafea-result-highlights__status', 'COMPUTED'),
  );
  heading.firstElementChild.append(
    create(root, 'h3', null, 'Engineering result summary'),
    create(root, 'p', null, `${model.loadCaseCount} retained case${model.loadCaseCount === 1 ? '' : 's'} · values below come directly from retained stage result evidence.`),
  );
  section.append(heading);

  const grid = create(root, 'div', 'lafea-result-highlights__grid');
  model.metrics.forEach((metric) => {
    const item = create(root, 'article', 'lafea-result-highlight');
    item.dataset.metric = metric.id;
    item.append(
      create(root, 'span', 'lafea-result-highlight__label', metric.label),
      create(root, 'strong', 'lafea-result-highlight__value', `${format(metric.value)}${metric.unit ? ` ${metric.unit}` : ''}`),
      create(root, 'span', 'lafea-result-highlight__location', metric.location),
    );
    grid.append(item);
  });
  section.append(grid);

  if (model.warningDisclosure) {
    const warning = create(root, 'p', 'lafea-result-highlights__warning', model.warningDisclosure);
    warning.dataset.role = 'lafea-transverse-load-warning';
    section.append(warning);
  }
  if (model.solverMethods.length) {
    section.append(create(
      root,
      'p',
      'lafea-result-highlights__solver',
      `Solver evidence: ${model.solverMethods.join(' • ')}`,
    ));
  }
  if (model.recoveryDisclosure) {
    section.append(create(root, 'p', 'lafea-result-highlights__recovery', model.recoveryDisclosure));
  }
  return section;
}

function buildEngineeringHighlights(stageId, result, unitsValue) {
  if (!result || typeof result !== 'object') return null;
  const units = unitsValue && typeof unitsValue === 'object' ? unitsValue : {};
  if (stageId === 'LAFEA.1') return buildFoundationHighlights(result, units);
  if (stageId === 'LAFEA.2') return buildScreeningHighlights(result, units);
  if (stageId !== 'LAFEA.3') return null;
  return buildContinuumHighlights(result, units);
}

function buildFoundationHighlights(result, units) {
  const forceUnit = units.force ?? '';
  const momentUnit = units.moment ?? '';
  const stressUnit = units.stress ?? units.pressure ?? '';
  const loadCases = array(result.transformedLoadCases);
  const pressureCases = array(result.pressureStressResults);
  let maxForce = null;
  let maxMoment = null;
  let maxHoop = null;
  let maxRadial = null;
  let maxAxialPressure = null;
  const axes = ['Fx', 'Fy', 'Fz'];
  const moments = ['Mx', 'My', 'Mz'];

  for (const loadCase of loadCases) {
    array(loadCase?.transformedForceLocal).forEach((value, index) => {
      if (!Number.isFinite(value)) return;
      maxForce = larger(maxForce, {
        value: Math.abs(value),
        location: `${loadCase.identity ?? 'load case'} · ${axes[index] ?? `F${index}`}`,
      });
    });
    array(loadCase?.transformedMomentLocal).forEach((value, index) => {
      if (!Number.isFinite(value)) return;
      maxMoment = larger(maxMoment, {
        value: Math.abs(value),
        location: `${loadCase.identity ?? 'load case'} · ${moments[index] ?? `M${index}`}`,
      });
    });
  }
  for (const pressureCase of pressureCases) {
    if (Number.isFinite(pressureCase?.axialPressureStress)) {
      maxAxialPressure = larger(maxAxialPressure, {
        value: Math.abs(pressureCase.axialPressureStress),
        location: `${pressureCase.identity ?? 'pressure case'} · axial pressure stress`,
      });
    }
    array(pressureCase?.requestedPoints).forEach((point, index) => {
      if (Number.isFinite(point?.hoopStress)) {
        maxHoop = larger(maxHoop, {
          value: Math.abs(point.hoopStress),
          location: `${pressureCase.identity ?? 'pressure case'} · point ${index + 1}`,
        });
      }
      if (Number.isFinite(point?.radialStress)) {
        maxRadial = larger(maxRadial, {
          value: Math.abs(point.radialStress),
          location: `${pressureCase.identity ?? 'pressure case'} · point ${index + 1}`,
        });
      }
    });
  }

  const metrics = [];
  pushMetric(metrics, 'max-transferred-force', 'Max |transferred force|', maxForce, forceUnit);
  pushMetric(metrics, 'max-transferred-moment', 'Max |transferred moment|', maxMoment, momentUnit);
  pushMetric(metrics, 'max-hoop-pressure-stress', 'Max |hoop pressure stress|', maxHoop, stressUnit);
  pushMetric(metrics, 'max-radial-pressure-stress', 'Max |radial pressure stress|', maxRadial, stressUnit);
  pushMetric(metrics, 'max-axial-pressure-stress', 'Max |axial pressure stress|', maxAxialPressure, stressUnit);
  return {
    loadCaseCount: loadCases.length,
    metrics,
    solverMethods: [],
    warningDisclosure: null,
    recoveryDisclosure: 'LAFEA.1 is an analytical load-transfer and elastic pressure baseline. It does not produce local attachment, shell-bending or weld stress.',
  };
}

function buildScreeningHighlights(result, units) {
  const stressUnit = units.stress ?? units.pressure ?? '';
  const envelopes = array(result.envelopes);
  const metrics = [];
  const quantities = [
    ['vonMisesMaximum', 'governing-von-mises', 'Governing nominal von Mises'],
    ['sigmaXMaximum', 'max-sigma-x', 'Max axial stress σx'],
    ['sigmaThetaMaximum', 'max-sigma-theta', 'Max circumferential stress σθ'],
    ['tauXThetaMaximum', 'max-tau-x-theta', 'Max torsional shear τxθ'],
    ['principalMaximum', 'max-principal', 'Maximum principal stress'],
  ];
  for (const [quantity, id, label] of quantities) {
    const row = envelopes.find((candidate) => candidate?.quantity === quantity);
    if (!row || !Number.isFinite(row.value)) continue;
    metrics.push({
      id,
      label,
      value: row.value,
      unit: stressUnit,
      location: `${row.screeningCaseId ?? 'case'} · ${row.evaluationLocationId ?? 'location'}`,
    });
  }
  const transverse = array(result.screeningCases).filter((row) => {
    const force = array(row?.combinedForceLocal);
    return Math.abs(force[1] ?? 0) > 0 || Math.abs(force[2] ?? 0) > 0;
  });
  const caseIds = new Set(envelopes.map((row) => row?.screeningCaseId).filter(Boolean));
  return {
    loadCaseCount: caseIds.size,
    metrics,
    solverMethods: [],
    warningDisclosure: transverse.length
      ? `LOCAL TRANSVERSE LOAD NOT RECOVERED — ${transverse.map((row) => row.screeningCaseId).join(', ')} retains nonzero Fy/Fz, but LAFEA.2 does not recover transverse-shear or local attachment stress from those components. Escalate the local response to the applicable detailed LAFEA stage.`
      : null,
    recoveryDisclosure: 'LAFEA.2 values are nominal pipe-section screening stresses and same-point tensor invariants; they are not local attachment, weld or shell-discontinuity stresses.',
  };
}

function buildContinuumHighlights(result, units) {
  const loadCases = Array.isArray(result.loadCaseResults) ? result.loadCaseResults : [];
  const lengthUnit = units.length ?? '';
  const stressUnit = units.stress ?? '';
  const forceUnit = units.force ?? '';
  const energyUnit = forceUnit && lengthUnit ? `${forceUnit}·${lengthUnit}` : '';
  const metrics = [];
  const energyMetrics = [];
  let maxDisplacement = null;
  let maxVonMises = null;
  let maxSigmaX = null;
  let maxReaction = null;
  let maxResidual = null;
  const solverMethods = new Set();

  for (const loadCase of loadCases) {
    const loadCaseId = String(loadCase?.loadCaseId ?? 'load case');
    for (const row of array(loadCase?.nodalDisplacements)) {
      if (!Number.isFinite(row?.ux) || !Number.isFinite(row?.uy)) continue;
      const value = Math.hypot(row.ux, row.uy);
      maxDisplacement = larger(maxDisplacement, {
        value,
        location: `${loadCaseId} · node ${row.nodeId ?? 'UNKNOWN'}`,
      });
    }
    if (Number.isFinite(loadCase?.totalStrainEnergy)) {
      energyMetrics.push({
        id: `elastic-energy-${loadCaseId}`,
        label: `Elastic strain energy · ${loadCaseId}`,
        value: loadCase.totalStrainEnergy,
        unit: energyUnit,
        location: `${loadCaseId} · retained physical elastic energy`,
      });
    }
    if (typeof loadCase?.solverEvidence?.method === 'string') {
      solverMethods.add(loadCase.solverEvidence.method);
    }
    for (const row of array(loadCase?.supportReactions)) {
      if (!Number.isFinite(row?.value)) continue;
      maxReaction = larger(maxReaction, {
        value: Math.abs(row.value),
        location: `${loadCaseId} · ${row.dofIdentity ?? 'constrained DOF'}`,
      });
    }
    for (const row of array(loadCase?.freeDofResiduals)) {
      if (!Number.isFinite(row?.value)) continue;
      maxResidual = larger(maxResidual, {
        value: Math.abs(row.value),
        location: `${loadCaseId} · ${row.dofIdentity ?? 'free DOF'}`,
      });
    }
    for (const elementResult of array(loadCase?.elementResults)) {
      const elementId = String(elementResult?.elementId ?? 'UNKNOWN');
      if (Number.isFinite(elementResult?.vonMises)) {
        maxVonMises = larger(maxVonMises, {
          value: elementResult.vonMises,
          location: `${loadCaseId} · element ${elementId}`,
        });
      }
      if (Number.isFinite(elementResult?.stress?.sigmaX)) {
        maxSigmaX = larger(maxSigmaX, {
          value: Math.abs(elementResult.stress.sigmaX),
          location: `${loadCaseId} · element ${elementId}`,
        });
      }
      array(elementResult?.gaussPointResults).forEach((point, pointIndex) => {
        const sx = finite(point?.stress?.sigmaX);
        if (sx !== null) {
          maxSigmaX = larger(maxSigmaX, {
            value: Math.abs(sx),
            location: `${loadCaseId} · element ${elementId} · ${integrationPointLabel(point, pointIndex)}`,
          });
        }
        if (Number.isFinite(point?.vonMises)) {
          maxVonMises = larger(maxVonMises, {
            value: point.vonMises,
            location: `${loadCaseId} · element ${elementId} · ${integrationPointLabel(point, pointIndex)}`,
          });
        }
      });
    }
  }

  pushMetric(metrics, 'max-displacement', 'Max displacement', maxDisplacement, lengthUnit);
  pushMetric(metrics, 'max-von-mises', 'Max von Mises', maxVonMises, stressUnit);
  pushMetric(metrics, 'max-sigma-x', 'Max |σx|', maxSigmaX, stressUnit);
  pushMetric(metrics, 'max-reaction', 'Max reaction', maxReaction, forceUnit);
  pushMetric(metrics, 'max-free-residual', 'Max free-DOF residual', maxResidual, forceUnit);
  metrics.push(...energyMetrics);

  return {
    loadCaseCount: loadCases.length,
    metrics,
    solverMethods: [...solverMethods].sort(),
    warningDisclosure: null,
    recoveryDisclosure: 'T6/Q8 integration-point stress and retained von Mises are authoritative. Nodal projection/averaging remains display-only and is never substituted into these highlights.',
  };
}

function integrationPointLabel(point, pointIndex) {
  return point?.pointId ? `IP ${point.pointId}` : `IP ${pointIndex + 1}`;
}

function pushMetric(metrics, id, label, candidate, unit) {
  if (!candidate) return;
  metrics.push({ id, label, value: candidate.value, unit, location: candidate.location });
}

function larger(current, candidate) {
  if (!candidate || !Number.isFinite(candidate.value)) return current;
  return !current || candidate.value > current.value ? candidate : current;
}

function presentationView(root, presentation) {
  const wrapper = create(root, 'div', 'lafea-result-presentation');
  for (const section of presentation.sections) {
    const block = create(root, 'section');
    block.append(create(root, 'h3', null, section.title), rowsTable(root, section.rows));
    wrapper.append(block);
  }

  if (presentation.governing) {
    wrapper.append(create(
      root,
      'p',
      'lafea-result-governing',
      `Governing retained evidence: ${presentation.governing.label} `
        + `${format(presentation.governing.value)} ${presentation.governing.unit}`,
    ));
  }

  if (presentation.limitations.length) {
    const list = create(root, 'ul', 'lafea-result-limitations');
    presentation.limitations.forEach((value) => {
      list.append(create(root, 'li', null, formatLimitation(String(value))));
    });
    wrapper.append(
      create(root, 'h4', 'lafea-result-limitations-title', 'Current stage limitations'),
      list,
    );
  }
  return wrapper;
}

function formatLimitation(code) {
  const known = {
    NO_CODE_COMPLIANCE: 'No code-compliance assessment is produced by this stage.',
    NO_CONTACT: 'No contact, friction, gap, lift-off or one-way behavior.',
    NO_FEA: 'No finite-element stiffness solution is performed by this stage.',
    NO_LOCAL_ATTACHMENT_STRESS: 'No local attachment or discontinuity stress is produced.',
    NO_SHELL_BENDING: 'No shell bending stress is produced.',
    NO_WELD_STRESS: 'No weld stress is produced.',
    NO_BUCKLING: 'No buckling assessment is produced.',
    NO_CRACK_OR_FRACTURE: 'No fracture or crack assessment is produced.',
    NO_FATIGUE: 'No fatigue assessment is produced.',
    ELASTIC_PRESSURE_STRESS_ONLY: 'Pressure evidence is limited to the declared elastic baseline.',
    NO_MATERIAL_ALLOWABLE_OR_PASS_FAIL_UTILIZATION: 'No material allowable or pass/fail utilization is produced.',
    NO_PLASTICITY: 'Material behavior is linear elastic; plasticity is excluded.',
    NO_STRESS_CONCENTRATION_FACTOR: 'No local stress-concentration factor is produced.',
    NO_TRANSVERSE_SHEAR_STRESS_RECOVERY: 'No transverse-shear stress recovery is produced.',
  };
  if (known[code]) return known[code];
  if (/^[A-Z0-9_]+$/u.test(code)) {
    return code.toLowerCase().replace(/_/g, ' ').replace(/^./, (character) => character.toUpperCase());
  }
  return code;
}

function rowsTable(root, rows) {
  const wrapper = create(root, 'div');
  let page = 0;
  const pageSize = 100;

  const render = () => {
    const start = page * pageSize;
    const values = rows.slice(start, start + pageSize);
    const table = create(root, 'table', 'lafea-result-table');
    const head = create(root, 'tr');
    ['Quantity', 'Value', 'Unit', 'Formula identity', 'Retained source path', 'Authority'].forEach((label) => {
      const cell = create(root, 'th', null, label);
      cell.scope = 'col';
      head.append(cell);
    });
    table.append(head);

    for (const row of values) {
      const record = create(root, 'tr');
      const label = create(root, 'th', null, String(row.label ?? 'Retained value'));
      label.scope = 'row';
      record.append(
        label,
        create(root, 'td', null, format(row.value)),
        create(root, 'td', null, String(row.unit ?? '')),
        create(root, 'td', null, humanizeIdentity(row.formulaId)),
        create(root, 'td', null, String(row.sourcePath ?? 'UNRESOLVED_SOURCE_PATH')),
        create(root, 'td', null, 'RETAINED_STAGE_RESULT'),
      );
      table.append(record);
    }

    wrapper.replaceChildren(table);
    if (rows.length > pageSize) {
      wrapper.append(pagination(root, start, values.length, rows.length, {
        previous: () => { page -= 1; render(); },
        next: () => { page += 1; render(); },
      }));
    }
  };

  render();
  return wrapper;
}

function rawEvidence(root, result) {
  const details = create(root, 'details', 'lafea-raw-evidence');
  const summary = create(root, 'summary', null, 'Advanced raw retained result evidence');
  const rows = flattenEvidence(result);
  const tableHost = create(root, 'div');
  let page = 0;
  const pageSize = 100;

  const render = () => {
    const start = page * pageSize;
    const values = rows.slice(start, start + pageSize);
    const table = create(root, 'table', 'lafea-result-table');
    const head = create(root, 'tr');
    ['Evidence path', 'Retained value', 'Data type', 'Authority classification'].forEach((label) => {
      const cell = create(root, 'th', null, label);
      cell.scope = 'col';
      head.append(cell);
    });
    table.append(head);

    values.forEach((row) => {
      const record = create(root, 'tr');
      const path = create(root, 'th', null, row.path);
      path.scope = 'row';
      record.append(
        path,
        create(root, 'td', null, row.value),
        create(root, 'td', null, row.type),
        create(root, 'td', null, 'RAW_RETAINED_FIELD'),
      );
      table.append(record);
    });

    tableHost.replaceChildren(table);
    if (rows.length > pageSize) {
      tableHost.append(pagination(root, start, values.length, rows.length, {
        previous: () => { page -= 1; render(); },
        next: () => { page += 1; render(); },
      }));
    }
  };
  render();

  const jsonDetails = create(root, 'details');
  const jsonSummary = create(root, 'summary', null, 'View or copy retained JSON');
  const pre = create(root, 'pre');
  pre.dataset.role = 'lafea-result';
  pre.textContent = JSON.stringify(result, null, 2);
  jsonDetails.append(jsonSummary, pre);
  details.append(summary, tableHost, jsonDetails);
  return details;
}

function flattenEvidence(value, path = 'result', rows = []) {
  if (Array.isArray(value)) {
    rows.push({ path, value: JSON.stringify(value), type: 'array' });
    return rows;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      flattenEvidence(child, `${path}.${key}`, rows);
    }
    return rows;
  }
  rows.push({ path, value: String(value ?? ''), type: value === null ? 'null' : typeof value });
  return rows;
}

function diagnosticsView(root, diagnostics) {
  const region = create(root, 'div', 'lafea-diagnostics');
  region.dataset.role = 'lafea-diagnostics';
  region.setAttribute('role', diagnostics.some((item) => item.severity === 'ERROR') ? 'alert' : 'status');
  region.setAttribute('aria-live', 'assertive');
  const list = create(root, 'ul');
  diagnostics.forEach((item) => {
    list.append(create(
      root,
      'li',
      null,
      `${item.code ?? item.severity}: ${item.message}${item.path ? ` [${item.path}]` : ''}`,
    ));
  });
  region.append(list);
  return region;
}

function pagination(root, start, count, total, handlers) {
  const controls = create(root, 'div', 'lafea-workbench__pagination');
  const previous = create(root, 'button', null, 'Previous');
  previous.type = 'button';
  previous.disabled = start === 0;
  previous.addEventListener('click', handlers.previous);
  const next = create(root, 'button', null, 'Next');
  next.type = 'button';
  next.disabled = start + count >= total;
  next.addEventListener('click', handlers.next);
  controls.append(
    create(root, 'output', null, `Showing ${total ? start + 1 : 0}-${start + count} of ${total}`),
    previous,
    next,
  );
  return controls;
}

function humanizeIdentity(value) {
  if (!value) return 'UNRESOLVED_FORMULA_IDENTITY';
  return String(value).replace(/_/g, ' ');
}
function array(value) { return Array.isArray(value) ? value : []; }
function finite(value) { return Number.isFinite(value) ? value : null; }

function format(value) {
  if (typeof value !== 'number') return String(value ?? '');
  if (!Number.isFinite(value)) return 'NON_FINITE';
  return Number(value.toPrecision(8)).toString();
}

function create(root, tag, className, text) {
  const element = root.ownerDocument.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
