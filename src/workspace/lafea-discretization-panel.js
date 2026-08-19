/** DOM renderer for the truthful Discretization surface. */
import { renderMeshQualityPanel } from './lafea-mesh-quality-panel.js';
import {
  button,
  mappingInspectionSection,
  node,
  region,
} from './lafea-discretization-dom.js';
import { generationSection } from './lafea-discretization-generation-panel.js';
import { lafeaWorkbenchReasonLabels } from './lafea-workbench-reason-labels.js';
import { lafeaUiStatusPresentation } from './lafea-ui-status.js';

export function renderLafeaDiscretizationPanel(root, model, handlers = {}) {
  if (!root?.ownerDocument) throw new TypeError('LAFEA_DISCRETIZATION_PANEL_ROOT_REQUIRED');
  if (model?.schema !== 'lafea-discretization-view-model/v1') {
    throw new TypeError('LAFEA_DISCRETIZATION_VIEW_MODEL_REQUIRED');
  }
  const doc = root.ownerDocument;
  const host = node(doc, 'div', 'lafea-discretization');
  host.dataset.role = 'lafea-discretization';
  host.dataset.custodyState = model.state;
  host.dataset.stepStatus = model.stepStatus;

  host.append(
    meshWorkspaceSummary(doc, model),
    generationSection(doc, model, handlers),
    qualitySection(doc, model, handlers),
    primaryActionSection(doc, model, handlers),
    advancedEvidence(doc, model, handlers),
  );
  root.replaceChildren(host);
  return host;
}

function meshWorkspaceSummary(doc, model) {
  const section = node(doc, 'section', 'lafea-mesh-workspace-summary');
  section.dataset.role = 'lafea-mesh-workspace-summary';
  const state = lafeaUiStatusPresentation(model.state);
  const heading = node(doc, 'div', 'lafea-mesh-workspace-summary__heading');
  heading.append(
    node(doc, 'div'),
    node(doc, 'strong', 'lafea-mesh-workspace-summary__state', state.label),
  );
  heading.lastElementChild.dataset.tone = state.tone;
  heading.firstElementChild.append(
    node(doc, 'h3', null, 'Mesh'),
    node(doc, 'p', null, 'Define the element family and target size, generate or adopt the governed mesh, then review quality before solving.'),
  );
  section.append(heading);

  const grid = node(doc, 'div', 'lafea-mesh-workspace-summary__grid');
  const values = [
    ['Element family', model.evidence.elementFamily ?? model.generation.declaredElementFamily ?? 'Not selected'],
    ['Target size', targetSize(model)],
    ['Nodes', model.evidence.present ? String(model.evidence.nodeCount) : '—'],
    ['Elements', model.evidence.present ? String(model.evidence.elementCount) : '—'],
    ['Warnings', String(model.evidence.warningElementIds?.length ?? 0)],
    ['Blocking', String(model.evidence.blockingElementIds?.length ?? 0)],
  ];
  values.forEach(([label, value]) => {
    const item = node(doc, 'div', 'lafea-mesh-workspace-summary__metric');
    item.append(node(doc, 'span', null, label), node(doc, 'strong', null, value));
    grid.append(item);
  });
  section.append(grid);
  return section;
}

function targetSize(model) {
  const value = model.generation.targetElementLength;
  if (!Number.isFinite(value)) return 'Not bound';
  return `${value}${model.generation.lengthUnit ? ` ${model.generation.lengthUnit}` : ''}`;
}

function qualitySection(doc, model, handlers) {
  const section = region(doc, 'Quality', 'quality');
  section.dataset.role = 'lafea-mesh-quality-workspace';

  if (model.reasons.length) {
    const labels = lafeaWorkbenchReasonLabels(model.reasons);
    const reasons = node(doc, 'ul', 'lafea-discretization__reason-list');
    labels.forEach((reason) => reasons.append(node(doc, 'li', null, reason)));
    section.append(reasons);
  }

  if (!model.evidence.present) {
    section.append(node(
      doc,
      'p',
      'lafea-discretization__status',
      model.applicable
        ? 'Generate, adopt, or import a governed analysis mesh to evaluate quality.'
        : 'Finite-element mesh quality is not applicable to this stage.',
    ));
    return section;
  }

  const qualityHost = node(doc, 'div');
  qualityHost.dataset.role = 'lafea-discretization-quality';
  renderMeshQualityPanel(qualityHost, model.evidence.qualityPanel, {
    stageId: model.stageId,
    onFocusElement: handlers.onFocusElement,
  });
  section.append(qualityHost);
  const mappingInspection = mappingInspectionSection(
    doc,
    model.evidence.mappingInspection,
    handlers.onFocusElement,
  );
  if (mappingInspection) section.append(mappingInspection);
  section.append(findingList(
    doc,
    'Warning elements',
    model.evidence.warningElementIds,
    'warning',
    handlers.onFocusElement,
  ));
  section.append(findingList(
    doc,
    'Blocking elements',
    model.evidence.blockingElementIds,
    'block',
    handlers.onFocusElement,
  ));
  return section;
}

function primaryActionSection(doc, model, handlers) {
  const section = region(doc, 'Continue', 'actions');
  const advance = button(doc, 'Advance to numerical preflight', () => handlers.onAdvance?.());
  advance.dataset.role = 'lafea-discretization-advance';
  advance.className = 'lafea-button lafea-button--primary';
  advance.disabled = !model.actions.canAdvance;
  advance.title = model.actions.warningReviewRequired
    ? 'Mesh warning review is required before this gate can advance.'
    : model.actions.canAdvance ? 'Discretization gate is clear.' : 'Discretization gate is not clear.';
  section.append(advance);
  return section;
}

function advancedEvidence(doc, model, handlers) {
  const details = node(doc, 'details', 'lafea-discretization__advanced-evidence');
  details.dataset.role = 'lafea-discretization-technical-evidence';
  details.append(node(doc, 'summary', null, 'Advanced mesh evidence and custody'));
  const body = node(doc, 'div', 'lafea-discretization__advanced-evidence-body');
  body.append(
    configurationSection(doc, model),
    previewSection(doc, model),
    retainedEvidenceSection(doc, model),
    evidenceActions(doc, model, handlers),
  );
  details.append(body);
  return details;
}

function configurationSection(doc, model) {
  const section = region(doc, 'Configuration and compatibility', 'configuration');
  const modeList = node(doc, 'ul', 'lafea-discretization__modes');
  for (const option of model.configuration.modes) {
    const item = node(doc, 'li');
    item.dataset.mode = option.mode;
    item.dataset.enabled = String(option.enabled);
    item.append(
      node(doc, 'strong', null, option.mode),
      node(doc, 'span', null, option.enabled ? ' — available' : ` — disabled: ${option.reason}`),
    );
    modeList.append(item);
  }
  section.append(modeList);

  const profile = node(
    doc,
    'p',
    null,
    `Governed mesh profile binding: ${model.configuration.meshProfileHash ?? 'UNBOUND'}`,
  );
  profile.dataset.role = 'lafea-discretization-profile';
  section.append(profile);

  const legacy = node(doc, 'details', 'lafea-discretization__legacy');
  legacy.dataset.role = 'lafea-mesh-config-preference';
  legacy.dataset.status = model.configuration.legacyMeshConfigStatus;
  legacy.append(node(doc, 'summary', null, `Legacy meshConfig — ${model.configuration.legacyMeshConfigStatus}`));
  legacy.append(node(
    doc,
    'p',
    null,
    'NO_ENGINEERING_EFFECT — this preference is excluded from canonical calculation identity and does not create or modify a mesh.',
  ));
  if (model.configuration.legacyMeshConfig) {
    const pre = node(doc, 'pre');
    pre.textContent = JSON.stringify(model.configuration.legacyMeshConfig, null, 2);
    legacy.append(pre);
  }
  section.append(legacy);
  return section;
}

function previewSection(doc, model) {
  const section = region(doc, 'Preview custody', 'preview');
  const status = node(doc, 'p', 'lafea-discretization__status', model.preview.status);
  status.dataset.role = 'lafea-discretization-preview-status';
  section.append(status);
  if (model.preview.retainedElementCount > 0) {
    section.append(node(
      doc,
      'p',
      null,
      `Retained evidence contains ${model.preview.retainedNodeCount} nodes and ${model.preview.retainedElementCount} elements.`,
    ));
  }
  return section;
}

function retainedEvidenceSection(doc, model) {
  const section = region(doc, 'Retained mesh custody', 'evidence');
  const badge = node(doc, 'strong', 'lafea-discretization__state', model.state);
  badge.dataset.role = 'lafea-discretization-state';
  badge.dataset.state = model.state;
  section.append(badge);

  if (!model.evidence.present) {
    section.append(node(
      doc,
      'p',
      null,
      model.applicable
        ? 'No retained full analysis-mesh evidence is available.'
        : 'Analysis mesh evidence is not applicable to this lifecycle profile.',
    ));
    return section;
  }

  const facts = node(doc, 'dl', 'lafea-discretization__facts');
  for (const [label, value] of evidenceFacts(model.evidence)) {
    facts.append(node(doc, 'dt', null, label), node(doc, 'dd', null, value ?? 'NONE'));
  }
  section.append(facts);
  return section;
}

function evidenceActions(doc, model, handlers) {
  const section = region(doc, 'Evidence actions', 'evidence-actions');
  const importLabel = node(doc, 'label', null, 'Import authorized mesh evidence');
  const file = node(doc, 'input');
  file.type = 'file';
  file.accept = '.json,application/json';
  file.dataset.role = 'lafea-analysis-mesh-import';
  file.disabled = !model.actions.canImportAuthorizedMesh;
  file.addEventListener('change', () => handlers.onImportEvidence?.(file.files?.[0] ?? null));
  importLabel.append(file);

  const validate = button(doc, 'Validate retained evidence', () => handlers.onValidateEvidence?.());
  validate.dataset.role = 'lafea-analysis-mesh-validate';
  validate.disabled = !model.evidence.present || !model.actions.canValidateEvidence;

  const exportButton = button(doc, 'Export mesh evidence', () => handlers.onExportEvidence?.());
  exportButton.dataset.role = 'lafea-analysis-mesh-export';
  exportButton.disabled = !model.actions.canExportEvidence;

  section.append(importLabel, validate, exportButton);
  return section;
}

function findingList(doc, title, ids, kind, onFocus) {
  const section = node(doc, 'div', 'lafea-discretization__findings');
  section.append(node(doc, 'h4', null, title));
  if (!ids.length) {
    section.append(node(doc, 'p', null, 'None'));
    return section;
  }
  const list = node(doc, 'ul');
  ids.forEach((id) => {
    const item = node(doc, 'li');
    const focus = button(doc, `Focus element ${id}`, () => onFocus?.(id));
    focus.dataset.role = `lafea-focus-${kind}-element`;
    focus.dataset.elementId = String(id);
    item.append(focus);
    list.append(item);
  });
  section.append(list);
  return section;
}

function evidenceFacts(value) {
  return [
    ['Mesh identity', value.meshIdentity],
    ['Mesh hash', value.meshHash],
    ['Profile', value.meshProfileIdentity],
    ['Profile hash', value.meshProfileHash],
    ['Source hash', value.sourceHash],
    ['Canonical model hash', value.canonicalModelHash],
    ['Analysis geometry hash', value.analysisGeometryHash],
    ['Artifact hash', value.artifactHash],
    ['Registration', value.registrationId],
    ['Producer', value.producerRef],
    ['Authority', value.authorityStatus],
    ['Nodes', String(value.nodeCount)],
    ['Elements', String(value.elementCount)],
  ];
}
