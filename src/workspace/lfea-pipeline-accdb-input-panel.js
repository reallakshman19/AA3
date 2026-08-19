import { readAccdbNamedTables } from '../core/fea-benchmarks/caesar-accdb-reader-core.js';
import { applyAccdbFieldOverrides } from '../core/linear-piping-analysis-consumer/accdb-field-overrides.js';
import {
  createLinearPipingAccdbIntake,
  prepareLinearPipingAccdbPreFlight,
} from './linear-piping-accdb-intake.js';
import { parseAccdbModelHealthSource } from '../core/linear-piping-analysis-consumer/accdb-source-binding.js';
import { diagnoseInputXmlLinearModelHealth } from '../core/linear-piping-analysis-consumer/inputxml-linear-model-health.js';
import { diagnoseInputXmlLinearPreFeaEngineeringSanity } from '../core/linear-piping-analysis-consumer/inputxml-linear-prefea-engineering-checks.js';
import {
  LFEA_PIPELINE_ACCDB_DEFAULT_PROFILE_ID,
  LFEA_PIPELINE_ACCDB_PROFILE_IDS,
  LFEA_PIPELINE_ACCDB_PROFILE_LABELS,
  buildAccdbElementPropertyRows,
  buildAccdbModelHealthViewModel,
} from './lfea-pipeline-accdb-view-model.js';

export const LFEA_PIPELINE_ACCDB_INPUT_PANEL_SCHEMA = 'lfea-pipeline-accdb-input-panel/v1';

/** The full ACCDB model table set (11 tables) -- matches caesar-accdb-package.js's MODEL_TABLES. */
export const LFEA_PIPELINE_ACCDB_MODEL_TABLES = Object.freeze([
  'INPUT_BASIC_ELEMENT_DATA', 'INPUT_BENDS', 'INPUT_CONTROL', 'INPUT_FORCMNT',
  'INPUT_NODAL_COORDINATES', 'INPUT_OFFSETS', 'INPUT_REDUCERS', 'INPUT_RESTRAINTS',
  'INPUT_RIGIDS', 'INPUT_SIFTEES', 'INPUT_UNITS',
]);

/**
 * Mount the ACCDB (CAESAR II database) source panel into the LFEA pipeline
 * shell's SOURCE host, alongside the InputXML and StagedJSON panels.
 *
 * Unlike StagedJSON, there is no ACCDB -> InputXML-text conversion this
 * adapter can reuse (see accdb-to-canonical-geometry.js's header), so this
 * panel does not hand off into the InputXML source panel's loadSource().
 * Instead it reads the ACCDB's full model table set in-browser, builds
 * canonical geometry directly (accdbTablesToCanonicalGeometry), wraps it in
 * a source bundle satisfying the same InputXmlModelHealthSource contract
 * (accdb-source-binding.js) via synthetic PIPINGELEMENT[i] identities, and
 * renders the resulting model-health/representability verdict here.
 *
 * The verdict is read through a selected analysis profile. Model-health
 * itself is profile-agnostic by design -- it reports both profiles and bakes
 * each finding's severity from the worse of the two -- so a panel that
 * printed those raw severities told an engineer running the disclosed
 * approximation profile that their model was blocked by exactly the
 * limitations that profile exists to accept. The profile selector here feeds
 * the same scoping a real run applies (see lfea-pipeline-accdb-view-model.js).
 *
 * Imported field values are editable, narrowly: the property table writes
 * raw cell overrides through accdb-field-overrides.js, which re-runs the
 * whole import from the edited tables and discloses every override. Geometry
 * and topology remain owned by the file.
 *
 * Scope, disclosed rather than silently implied: this is geometry/model-
 * health extraction only -- linear-static representability, not a sealed
 * pre-FEA authorization or a solve. No nonlinear/friction analysis is
 * performed. The synthetic identity is surfaced explicitly (dataset-role
 * accdb-identity-disclosure) rather than left to look like a native
 * CAESAR II PIPINGELEMENT tag.
 */
export function mountLfeaPipelineAccdbInputPanel(sourceHostElement, options = {}) {
  if (!sourceHostElement || typeof sourceHostElement.append !== 'function') {
    throw new TypeError('ACCDB input panel requires a source host element.');
  }
  const documentRef = options.documentRef ?? sourceHostElement.ownerDocument ?? document;
  return new LfeaPipelineAccdbInputPanelController(sourceHostElement, documentRef, options).init();
}

export class LfeaPipelineAccdbInputPanelController {
  constructor(hostElement, documentRef, options = {}) {
    this.hostElement = hostElement;
    this.documentRef = documentRef;
    this.options = options;
    this.readTables = options.readTables ?? readAccdbNamedTables;
    this.elements = null;
    this.initialized = false;
    this.fileName = null;
    this.tables = null;
    this.effectiveTables = null;
    this.effectiveTables = null;
    this.preFlight = null;
    this.preFlightError = '';
    this.sourceBundle = null;
    this.modelHealth = null;
    this.healthView = null;
    this.propertyRows = Object.freeze([]);
    this.engineeringSanity = null;
    this.preFlight = null;
    this.preFlightError = '';
    this.requestedProfileId = requireProfileId(options.requestedProfileId ?? LFEA_PIPELINE_ACCDB_DEFAULT_PROFILE_ID);
    this.overrideSet = null;
    this.overrideDisclosures = Object.freeze([]);
    this.overrideDrafts = new Map();
    this.overrideApprover = '';
    this.overrideReason = '';
    this.showProperties = false;
    this.message = 'Import a CAESAR II ACCDB source for geometry/model-health extraction.';
    this.error = '';
    this.busy = false;
  }

  init() {
    if (this.initialized) return this;
    this.elements = createAccdbInputPanelSection(this.documentRef);
    this.hostElement.append(this.elements.section);
    this.elements.importButton.addEventListener('click', () => this.elements.fileInput.click());
    this.elements.fileInput.addEventListener('change', () => this.loadSelectedFile());
    this.elements.clearButton.addEventListener('click', () => this.clear());
    this.elements.profileSelect.addEventListener('change', () => {
      this.setRequestedProfile(this.elements.profileSelect.value);
    });
    this.initialized = true;
    this.render();
    return this;
  }

  async loadSelectedFile() {
    const file = this.elements?.fileInput.files?.[0];
    if (!file) return;
    if (this.busy) return;
    await this.loadFile(file);
  }

  async loadFile(file) {
    if (!file || typeof file.arrayBuffer !== 'function') {
      throw new TypeError('An ACCDB File is required.');
    }
    this.fileName = file.name;
    this.sourceBundle = null;
    this.modelHealth = null;
    this.engineeringSanity = null;
    this.error = '';
    this.message = `Reading ${file.name}…`;
    this.busy = true;
    this.render();
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const readLog = [];
      this.tables = await this.readTables(bytes, LFEA_PIPELINE_ACCDB_MODEL_TABLES, readLog);
      this.extract(this.tables);
      this.message = `Loaded ${file.name}: ${this.sourceBundle.elementRecords.length} element(s), `
        + `${this.sourceBundle.geometry.nodes.length} node(s). See the model-health verdict below.`;
    } catch (error) {
      this.error = errorMessage(error);
      this.message = `ACCDB extraction failed for ${file.name}.`;
    } finally {
      this.busy = false;
      if (this.elements) this.elements.fileInput.value = '';
      this.render();
      this.notifyStateChanged();
    }
  }

  /** Build every derived record from one exact table set. */
  extract(tables) {
    this.effectiveTables = tables;
    this.sourceBundle = parseAccdbModelHealthSource(tables, {
      source: `accdb-panel-${this.fileName}`,
      fileName: this.fileName,
    });
    this.modelHealth = diagnoseInputXmlLinearModelHealth(this.sourceBundle, {});
    this.healthView = buildAccdbModelHealthViewModel(this.modelHealth, this.requestedProfileId);
    this.propertyRows = buildAccdbElementPropertyRows(this.sourceBundle);
    this.engineeringSanity = diagnoseInputXmlLinearPreFeaEngineeringSanity(this.sourceBundle);
    this.prepare(tables);
  }

  /**
   * Take the imported model through the same governed pre-flight an InputXML
   * import goes through, so the Load-case, Run and Output steps have the
   * authority they consume. A model that fails closed here still shows its
   * verdict above -- the failure is reported, not swallowed, and it never
   * takes the panel's own extraction down with it.
   */
  prepare(tables) {
    this.preFlight = null;
    this.preFlightError = '';
    try {
      const intake = createLinearPipingAccdbIntake(tables, {
        fileName: this.fileName,
        requestedProfileId: this.requestedProfileId,
        requestedCaseIds: this.requestedCaseIds ?? undefined,
      });
      this.preFlight = prepareLinearPipingAccdbPreFlight(intake, this.sourceBundle);
    } catch (error) {
      this.preFlightError = errorMessage(error);
    }
  }

  /**
   * The sealed pre-flight this source produced, or null. The Load-case step
   * reads this exactly as it reads the InputXML workflow's.
   */
  getPreFlight() {
    return this.preFlight;
  }

  getNodeIds() {
    return this.preFlight?.preparation?.structuralPreparation?.conditionedTopology?.geometry?.nodes
      ?.map((node) => node.id) ?? [];
  }

  /**
   * Re-read the existing verdict through another profile. The model-health
   * record is unchanged -- only which of its two profiles is being read is --
   * so nothing is re-parsed and no evidence hash moves.
   */
  setRequestedProfile(requestedProfileId) {
    this.requestedProfileId = requireProfileId(requestedProfileId);
    if (this.modelHealth) {
      this.healthView = buildAccdbModelHealthViewModel(this.modelHealth, this.requestedProfileId);
    }
    // The requested profile is sealed into the pre-flight's identity, so it
    // cannot be swapped after the fact -- the pre-flight is rebuilt for the
    // newly selected profile rather than left describing the previous one.
    if (this.effectiveTables) this.prepare(this.effectiveTables);
    this.render();
    this.notifyStateChanged();
  }

  setOverrideDraft(accdbElementId, field, rawText) {
    const key = `${accdbElementId}:${field}`;
    const text = String(rawText ?? '').trim();
    if (text === '') this.overrideDrafts.delete(key);
    else this.overrideDrafts.set(key, text);
  }

  togglePropertyTable() {
    this.showProperties = !this.showProperties;
    this.render();
  }

  /**
   * Apply every drafted override as one authorized edit.
   *
   * The edit is applied to the as-imported tables, never to the previously
   * overridden ones, so the drafted values always mean what the table shows
   * the engineer -- an override can be revised or withdrawn without
   * compounding onto an earlier edit. The full import runs again from the
   * edited tables, so the resulting verdict is a real verdict on the edited
   * model, not the old verdict with values swapped underneath it.
   */
  applyOverrides() {
    if (!this.tables) throw new TypeError('No ACCDB source is loaded.');
    const overrides = [...this.overrideDrafts.entries()].map(([key, rawValue]) => {
      const separator = key.lastIndexOf(':');
      return { accdbElementId: key.slice(0, separator), field: key.slice(separator + 1), rawValue };
    });
    this.error = '';
    try {
      const applied = applyAccdbFieldOverrides(this.tables, {
        approver: this.overrideApprover,
        reason: this.overrideReason,
        overrides,
      });
      this.extract(applied.tables);
      this.overrideSet = applied.overrideSet;
      this.overrideDisclosures = applied.disclosures;
      this.message = `Applied ${applied.disclosures.length} engineer override(s) to ${this.fileName} and re-ran extraction.`;
    } catch (error) {
      this.error = errorMessage(error);
      this.message = 'Overrides were not applied; the imported values are unchanged.';
    }
    this.render();
    this.notifyStateChanged();
  }

  /** Withdraw every override and return to the values exactly as imported. */
  resetOverrides() {
    if (!this.tables) return;
    this.overrideDrafts.clear();
    this.overrideSet = null;
    this.overrideDisclosures = Object.freeze([]);
    this.error = '';
    this.extract(this.tables);
    this.message = `Overrides withdrawn; ${this.fileName} is back to its imported values.`;
    this.render();
    this.notifyStateChanged();
  }

  clear() {
    this.fileName = null;
    this.tables = null;
    this.effectiveTables = null;
    this.sourceBundle = null;
    this.modelHealth = null;
    this.healthView = null;
    this.propertyRows = Object.freeze([]);
    this.engineeringSanity = null;
    this.overrideSet = null;
    this.overrideDisclosures = Object.freeze([]);
    this.overrideDrafts.clear();
    this.overrideApprover = '';
    this.overrideReason = '';
    this.showProperties = false;
    this.error = '';
    this.message = 'Import a CAESAR II ACCDB source for geometry/model-health extraction.';
    if (this.elements) this.elements.fileInput.value = '';
    this.render();
    this.notifyStateChanged();
  }

  getSnapshot() {
    return Object.freeze({
      schema: LFEA_PIPELINE_ACCDB_INPUT_PANEL_SCHEMA,
      fileName: this.fileName,
      elementCount: this.sourceBundle?.elementRecords.length ?? null,
      nodeCount: this.sourceBundle?.geometry.nodes.length ?? null,
      capabilityStatusById: this.modelHealth?.summary.capabilityStatusById ?? null,
      requestedProfileId: this.requestedProfileId,
      scopedCapabilityStatusById: this.healthView === null ? null : Object.freeze(Object.fromEntries(
        this.healthView.capabilities.map((row) => [row.capabilityId, row.status]),
      )),
      scopedBlockingFindingCount: this.healthView?.blockingCount ?? null,
      findingGroupCount: this.healthView?.findingGroups.length ?? null,
      preFlightStatus: this.preFlight?.status ?? (this.preFlightError ? 'FAILED' : 'NOT_PREPARED'),
      preFlightSolveAuthorized: this.preFlight?.solveAuthorized ?? false,
      availableCaseIds: this.preFlight?.sourceSummary.availableCaseIds ?? Object.freeze([]),
      preFlightError: this.preFlightError || null,
      overrideCount: this.overrideSet?.overrides.length ?? 0,
      overrideApprover: this.overrideSet?.approver ?? null,
      engineeringSanityFindingCount: this.engineeringSanity?.summary.findingCount ?? null,
      message: this.message,
      error: this.error || null,
    });
  }

  destroy() {
    this.elements?.section.remove();
    this.elements = null;
    this.initialized = false;
  }

  /**
   * Announce a real state change to the host shell.
   *
   * Deliberately not called from render(): init() renders once while the
   * caller's own `const panel = mount(...)` binding is still being assigned,
   * so a listener that reads the panel back would hit it in the temporal
   * dead zone. Every genuine state transition notifies below instead.
   */
  notifyStateChanged() {
    this.options.onStateChanged?.(this.getSnapshot());
  }

  render() {
    if (!this.elements) return;
    this.elements.status.textContent = this.message;
    this.elements.error.hidden = !this.error;
    this.elements.error.textContent = this.error;
    this.elements.importButton.disabled = this.busy;
    this.elements.clearButton.disabled = this.busy;
    this.elements.profileSelect.value = this.requestedProfileId;
    renderAccdbSourceSummary(this.documentRef, this.elements.summaryRoot, this);
    this.elements.section.dataset.fileName = this.fileName ?? '';
    this.elements.section.dataset.modelHealthStatus = topStatus(this.modelHealth);
    this.elements.section.dataset.requestedProfile = this.requestedProfileId;
    this.elements.section.dataset.overrideCount = String(this.overrideSet?.overrides.length ?? 0);
  }
}

function requireProfileId(requestedProfileId) {
  if (!LFEA_PIPELINE_ACCDB_PROFILE_IDS.includes(requestedProfileId)) {
    throw new TypeError(`Unknown analysis profile ${requestedProfileId}.`);
  }
  return requestedProfileId;
}

function createAccdbInputPanelSection(doc) {
  const section = doc.createElement('section');
  section.className = 'properties-accordion-section linear-piping-results-workbench';
  section.dataset.sectionId = 'lfea-pipeline-accdb-input';
  section.dataset.role = 'lfea-pipeline-accdb-input-panel';

  const header = doc.createElement('header');
  header.className = 'accordion-section-header';
  const title = doc.createElement('span');
  title.className = 'accordion-section-title';
  title.textContent = 'ACCDB — CAESAR II database (linear geometry only)';
  header.append(title);

  const body = doc.createElement('div');
  body.className = 'accordion-section-body';
  const toolbar = doc.createElement('div');
  toolbar.className = 'linear-piping-results-workbench__toolbar';

  const importButton = button(doc, 'Import CAESAR II ACCDB');
  importButton.dataset.action = 'import-lfea-pipeline-accdb-source';
  const fileInput = doc.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.accdb,.mdb';
  fileInput.hidden = true;
  fileInput.dataset.role = 'lfea-pipeline-accdb-source-file';

  const clearButton = button(doc, 'Clear');
  clearButton.dataset.action = 'clear-lfea-pipeline-accdb-source';

  // Which profile the verdict below is read through. The default matches the
  // InputXML surface's own default (the disclosed approximation profile):
  // strict is the stricter claim, so it is chosen deliberately, not by
  // landing on it.
  const profileLabel = doc.createElement('label');
  profileLabel.textContent = 'Analysis profile ';
  const profileSelect = doc.createElement('select');
  profileSelect.dataset.role = 'lfea-pipeline-accdb-profile';
  for (const profileId of LFEA_PIPELINE_ACCDB_PROFILE_IDS) {
    const option = doc.createElement('option');
    option.value = profileId;
    option.textContent = LFEA_PIPELINE_ACCDB_PROFILE_LABELS[profileId] ?? profileId;
    profileSelect.append(option);
  }
  profileLabel.append(profileSelect);

  toolbar.append(importButton, fileInput, clearButton, profileLabel);

  const status = doc.createElement('output');
  status.className = 'linear-piping-results-workbench__status';
  status.dataset.role = 'lfea-pipeline-accdb-status';
  status.setAttribute('aria-live', 'polite');
  const error = doc.createElement('p');
  error.className = 'linear-piping-results-workbench__error';
  error.dataset.role = 'lfea-pipeline-accdb-error';
  error.hidden = true;
  const summaryRoot = doc.createElement('div');
  summaryRoot.dataset.role = 'lfea-pipeline-accdb-summary';

  body.append(toolbar, status, error, summaryRoot);
  section.append(header, body);
  return { section, importButton, fileInput, clearButton, profileSelect, status, error, summaryRoot };
}

function renderAccdbSourceSummary(doc, root, controller) {
  root.replaceChildren();

  const disclosure = doc.createElement('p');
  disclosure.dataset.role = 'accdb-identity-disclosure';
  disclosure.textContent = [
    'ACCDB elements never carried a native CAESAR II PIPINGELEMENT XML tag.',
    'This panel assigns each ACCDB element a synthetic PIPINGELEMENT[i] identity',
    'only to satisfy the shared model-health contract InputXML and StagedJSON already use.',
    'Node/element geometry itself is read directly from the ACCDB tables, not fabricated.',
  ].join(' ');
  root.append(disclosure);

  if (!controller.sourceBundle) {
    const empty = doc.createElement('p');
    empty.textContent = 'No ACCDB source is loaded.';
    root.append(empty);
    return;
  }

  const rows = [];
  rows.push(['File', controller.fileName]);
  rows.push(['Format', 'CAESAR II ACCDB (linear geometry extraction only)']);
  rows.push(['Elements', String(controller.sourceBundle.elementRecords.length)]);
  rows.push(['Nodes', String(controller.sourceBundle.geometry.nodes.length)]);
  rows.push(['Segments', String(controller.sourceBundle.geometry.segments.length)]);
  rows.push(['Length unit', controller.sourceBundle.unitSystem.lengthUnit]);

  const table = doc.createElement('table');
  for (const [label, value] of rows) {
    const tr = doc.createElement('tr');
    const th = doc.createElement('th');
    th.scope = 'row';
    th.textContent = label;
    const td = doc.createElement('td');
    td.textContent = value;
    tr.append(th, td);
    table.append(tr);
  }
  root.append(table);

  if (controller.healthView) {
    renderCapabilities(doc, root, controller);
    renderFindingGroups(doc, root, controller);
  }

  if (controller.engineeringSanity) {
    const sanityHeading = doc.createElement('strong');
    sanityHeading.textContent = `Engineering sanity findings — ${controller.engineeringSanity.summary.findingCount}`;
    root.append(sanityHeading);
  }

  renderOverrideSection(doc, root, controller);

  const execution = doc.createElement('p');
  execution.dataset.role = 'lfea-pipeline-accdb-execution-boundary';
  execution.textContent = 'Execution custody: NOT CONNECTED. This ACCDB source panel reports geometry/model-health representability only; it does not seal a pre-FEA authorization or run a solve.';
  root.append(execution);
}

function renderCapabilities(doc, root, controller) {
  const heading = doc.createElement('strong');
  heading.textContent = `Model-health capabilities — ${controller.requestedProfileId}`;
  root.append(heading);

  const note = doc.createElement('p');
  note.dataset.role = 'lfea-pipeline-accdb-profile-note';
  note.textContent = 'Statuses are scoped to the selected profile. NOT_APPLICABLE marks a capability belonging to the other profile family — a path this request never takes, not a failure. A capability marked "does not gate a solve" is disclosed but never blocks one.';
  root.append(note);

  const capTable = doc.createElement('table');
  capTable.dataset.role = 'lfea-pipeline-accdb-capabilities';
  for (const capability of controller.healthView.capabilities) {
    const tr = doc.createElement('tr');
    tr.dataset.status = capability.status;
    tr.dataset.appliesToProfile = String(capability.appliesToProfile);
    tr.dataset.gatesSolve = String(capability.gatesSolve);
    const th = doc.createElement('th');
    th.scope = 'row';
    th.textContent = capability.capabilityId;
    const td = doc.createElement('td');
    td.textContent = capability.gatesSolve
      ? capability.status
      : `${capability.status} (does not gate a solve)`;
    tr.append(th, td);
    capTable.append(tr);
  }
  root.append(capTable);
}

function renderFindingGroups(doc, root, controller) {
  const view = controller.healthView;
  const findingHeading = doc.createElement('strong');
  findingHeading.textContent = `Findings — ${view.findingCount} occurrence(s) in ${view.findingGroups.length} group(s), `
    + `${view.blockingCount} blocking for this profile`;
  root.append(findingHeading);

  if (view.findingGroups.length === 0) {
    const none = doc.createElement('p');
    none.textContent = 'No findings.';
    root.append(none);
    return;
  }

  // Sorted into the questions they answer -- can the file be read, does the
  // model hold together, can the solver represent it, what is deferred --
  // rather than one flat list the reader has to triage by eye.
  for (const section of view.findingSections) {
    const sectionRoot = doc.createElement('section');
    sectionRoot.dataset.role = 'lfea-pipeline-accdb-finding-section';
    sectionRoot.dataset.sectionId = section.sectionId;
    sectionRoot.dataset.severity = section.severity;

    const heading = doc.createElement('strong');
    heading.textContent = section.blockingCount > 0
      ? `${section.title} — ${section.occurrenceCount} occurrence(s), ${section.blockingCount} blocking`
      : `${section.title} — ${section.occurrenceCount} occurrence(s)`;
    sectionRoot.append(heading);

    const description = doc.createElement('p');
    description.dataset.role = 'lfea-pipeline-accdb-finding-section-description';
    description.textContent = section.description;
    sectionRoot.append(description);

    sectionRoot.append(findingGroupList(doc, section.groups));
    root.append(sectionRoot);
  }
}

function findingGroupList(doc, groups) {
  const list = doc.createElement('ul');
  list.dataset.role = 'lfea-pipeline-accdb-finding-groups';
  for (const group of groups) {
    const item = doc.createElement('li');
    item.dataset.severity = group.severity;
    item.dataset.code = group.code;
    item.dataset.count = String(group.count);

    const details = doc.createElement('details');
    const summary = doc.createElement('summary');
    const scopedNote = group.scopedByProfile ? ' · relaxed by the selected profile' : '';
    summary.textContent = `${group.severity.toUpperCase()} · ${group.code} · ${group.count} occurrence(s)${scopedNote}`;
    details.append(summary);

    // One representative message plus the affected elements: the per-element
    // repeats say the same sentence, so the sentence is printed once and the
    // identities are listed rather than re-printed 96 times.
    const message = doc.createElement('p');
    message.textContent = group.occurrences[0].message;
    details.append(message);
    if (group.entityLabel) {
      const entities = doc.createElement('p');
      entities.dataset.role = 'lfea-pipeline-accdb-finding-entities';
      entities.textContent = `Affected: ${group.entityLabel}`;
      details.append(entities);
    }
    if (group.remediation) {
      const remediation = doc.createElement('p');
      remediation.textContent = `Remediation: ${group.remediation}`;
      details.append(remediation);
    }
    item.append(details);
    list.append(item);
  }
  return list;
}

/**
 * The property table and its override controls.
 *
 * Every field shows the raw cell in the file's declared unit next to the
 * converted value the analysis uses, and its disposition, so an inherited or
 * blank-sentinel value is never mistaken for a value the file declared. The
 * override input writes the raw cell, in the file's unit -- stated on the
 * form rather than left to be inferred.
 */
function renderOverrideSection(doc, root, controller) {
  if (!controller.sourceBundle) return;

  const heading = doc.createElement('strong');
  heading.textContent = 'Element properties';
  root.append(heading);

  const scope = doc.createElement('p');
  scope.dataset.role = 'accdb-override-scope-disclosure';
  scope.textContent = 'Overrides replace the raw cell in the file\'s own declared units and re-run the whole import, so inheritance and unit conversion behave exactly as if the file carried the value. Node ids and element geometry are not overridable — geometry and topology stay owned by the file. Every applied override is listed below and carries its approver and reason.';
  root.append(scope);

  if (controller.overrideDisclosures.length > 0) {
    const appliedHeading = doc.createElement('p');
    appliedHeading.dataset.role = 'accdb-applied-overrides';
    appliedHeading.textContent = `Engineer overrides in force — ${controller.overrideDisclosures.length} `
      + `(approver: ${controller.overrideSet.approver}; reason: ${controller.overrideSet.reason})`;
    root.append(appliedHeading);
    const appliedList = doc.createElement('ul');
    for (const disclosure of controller.overrideDisclosures) {
      const item = doc.createElement('li');
      item.dataset.code = disclosure.code;
      item.textContent = disclosure.message;
      appliedList.append(item);
    }
    root.append(appliedList);
  }

  const toggle = button(doc, controller.showProperties ? 'Hide element property table' : 'Show element property table');
  toggle.dataset.action = 'toggle-lfea-pipeline-accdb-properties';
  toggle.addEventListener('click', () => controller.togglePropertyTable());
  root.append(toggle);
  if (!controller.showProperties) return;

  const custody = doc.createElement('div');
  custody.dataset.role = 'accdb-override-custody';
  const approver = labelledTextInput(doc, 'Approver ', 'accdb-override-approver', controller.overrideApprover);
  approver.input.addEventListener('input', () => { controller.overrideApprover = approver.input.value; });
  const reason = labelledTextInput(doc, 'Reason ', 'accdb-override-reason', controller.overrideReason);
  reason.input.addEventListener('input', () => { controller.overrideReason = reason.input.value; });
  const applyButton = button(doc, 'Apply overrides');
  applyButton.dataset.action = 'apply-lfea-pipeline-accdb-overrides';
  applyButton.addEventListener('click', () => controller.applyOverrides());
  const resetButton = button(doc, 'Withdraw overrides');
  resetButton.dataset.action = 'reset-lfea-pipeline-accdb-overrides';
  resetButton.addEventListener('click', () => controller.resetOverrides());
  custody.append(approver.label, reason.label, applyButton, resetButton);
  root.append(custody);

  const table = doc.createElement('table');
  table.dataset.role = 'lfea-pipeline-accdb-element-properties';
  const head = doc.createElement('tr');
  for (const columnLabel of ['Element', 'From', 'To', 'Type', 'Field', 'Raw (file unit)', 'Disposition', 'Converted (SI)', 'Override (file unit)']) {
    const th = doc.createElement('th');
    th.scope = 'col';
    th.textContent = columnLabel;
    head.append(th);
  }
  table.append(head);

  for (const row of controller.propertyRows) {
    for (const [index, fieldRow] of row.fields.entries()) {
      const tr = doc.createElement('tr');
      tr.dataset.accdbElementId = row.accdbElementId;
      tr.dataset.field = fieldRow.name;
      tr.dataset.disposition = fieldRow.disposition;
      // Element identity is printed once per element, not once per field.
      tr.append(
        cell(doc, index === 0 ? row.accdbElementId : ''),
        cell(doc, index === 0 ? row.fromNodeId ?? '' : ''),
        cell(doc, index === 0 ? row.toNodeId ?? '' : ''),
        cell(doc, index === 0 ? row.canonicalSegmentType ?? '' : ''),
        cell(doc, fieldRow.name),
        cell(doc, displayValue(fieldRow.rawValue)),
        cell(doc, fieldRow.disposition),
        cell(doc, displayValue(fieldRow.canonicalValue)),
      );

      const overrideCell = doc.createElement('td');
      const input = doc.createElement('input');
      input.type = fieldRow.kind === 'STRING' ? 'text' : 'number';
      if (fieldRow.kind !== 'STRING') input.step = 'any';
      input.dataset.role = 'accdb-override-input';
      input.dataset.accdbElementId = row.accdbElementId;
      input.dataset.field = fieldRow.name;
      input.value = controller.overrideDrafts.get(`${row.accdbElementId}:${fieldRow.name}`) ?? '';
      input.addEventListener('input', () => {
        controller.setOverrideDraft(row.accdbElementId, fieldRow.name, input.value);
      });
      overrideCell.append(input);
      tr.append(overrideCell);
      table.append(tr);
    }
  }
  root.append(table);
}

function labelledTextInput(doc, labelText, role, value) {
  const label = doc.createElement('label');
  label.textContent = labelText;
  const input = doc.createElement('input');
  input.type = 'text';
  input.dataset.role = role;
  input.value = value ?? '';
  label.append(input);
  return { label, input };
}

function cell(doc, text) {
  const td = doc.createElement('td');
  td.textContent = text;
  return td;
}

function displayValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return String(Number(value.toPrecision(9)));
  return String(value);
}

function topStatus(modelHealth) {
  if (!modelHealth) return 'NOT_LOADED';
  const source = modelHealth.summary.capabilityStatusById?.SOURCE_ACCEPTANCE ?? 'UNKNOWN';
  const topology = modelHealth.summary.capabilityStatusById?.TOPOLOGY_ACCEPTANCE ?? 'UNKNOWN';
  if (source === 'BLOCK' || topology === 'BLOCK') return 'BLOCK';
  if (source === 'CONDITIONAL' || topology === 'CONDITIONAL') return 'CONDITIONAL';
  return 'PASS';
}

function button(doc, label) {
  const value = doc.createElement('button');
  value.type = 'button';
  value.textContent = label;
  return value;
}

function errorMessage(error) {
  const prefix = error?.code ? `${error.code}: ` : '';
  return `${prefix}${error?.message ?? String(error)}`;
}
