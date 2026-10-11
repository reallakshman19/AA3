import { buildLfeaGeometryReview } from '../lfea-model-review/lfea-geometry-review.js';
import {
  renderLfeaGeometryReviewSvg,
  zoomLfeaGeometryViewBox,
  LFEA_GEOMETRY_DEFAULT_VIEW_BOX,
  LFEA_GEOMETRY_BUTTON_ZOOM_FACTOR,
} from '../lfea-model-review/lfea-geometry-review-svg.js';
import { ACCDB_ELEMENT_FIELD_SPECS } from '../../core/linear-piping-analysis-consumer/accdb-source-binding.js';
import {
  resolveLfeaAccdbFindingTargets,
  sourceElementForSegment,
  findingsForAccdbSelection,
} from './lfea-accdb-finding-locator.js';

export const LFEA_ACCDB_REPAIR_WORKSPACE_SCHEMA = 'lfea-accdb-repair-workspace/v1';

/**
 * Common Error Check's source-bound model workspace. SVG is a selector, never
 * the edited source. The only write is through the ACCDB input controller's
 * atomic raw-table correction + fresh governed preparation path.
 */
export function mountLfeaAccdbRepairWorkspace(host, options) {
  if (!host || typeof host.append !== 'function') throw new TypeError('Repair workspace needs a host.');
  const doc = options.documentRef ?? host.ownerDocument;
  return new LfeaAccdbRepairWorkspaceController(host, doc, options).init();
}

export class LfeaAccdbRepairWorkspaceController {
  constructor(host, doc, options) {
    this.host = host;
    this.doc = doc;
    this.options = options;
    this.section = null;
    this.representation = 'SOURCE';
    this.verticalAxis = 'Y';
    this.viewBoxByMode = new Map();
    this.searchTerm = '';
    this.selection = null;
    this.focusedFinding = null;
    this.sourceIdentity = null;
    this.pending = null;
    this.pendingProperty = null;
    this.loadedDraft = null;
    this.message = '';
    this.error = '';
    this.axis = 'X';
    this.rawValue = '';
    this.field = 'DIAMETER';
    this.propertyValue = '';
    this.approver = '';
    this.reason = '';
    this.onRefresh = () => this.refresh();
  }

  init() {
    if (this.section) return this;
    this.section = this.doc.createElement('section');
    this.section.className = 'lfea-accdb-repair-workspace';
    this.section.dataset.role = 'lfea-accdb-repair-workspace';
    this.host.append(this.section);
    this.host.addEventListener?.('lfea-source-presentation-refresh', this.onRefresh);
    this.refresh();
    return this;
  }

  active() {
    const pre = this.options.getPreFlight();
    const source = pre?.diagnostics?.sourceBundle;
    const editor = this.options.getAccdbController?.();
    return source?.sourceKind === 'ACCDB' && editor?.getSnapshot?.().fileName
      ? { pre, source, editor }
      : null;
  }

  refresh() {
    const active = this.active();
    const identity = active?.editor.getCoordinateEditorSnapshot().sourceIdentity ?? null;
    if (identity !== this.sourceIdentity) {
      this.sourceIdentity = identity;
      this.selection = null;
      this.focusedFinding = null;
      this.pending = null;
      this.pendingProperty = null;
      this.loadedDraft = null;
      this.viewBoxByMode.clear();
      this.searchTerm = '';
      this.message = '';
      this.error = '';
    }
    this.render();
    return this;
  }

  locateOccurrence(finding, { edit = false } = {}) {
    const active = this.active();
    if (!active) return false;
    this.representation = 'SOURCE';
    const descriptor = this.geometry(active.pre).selected;
    const targets = resolveLfeaAccdbFindingTargets(finding, active.source, descriptor);
    this.focusedFinding = finding;
    this.pending = null;
    this.error = '';
    this.selection = targets.nodeIds.length
      ? { kind: 'NODE', id: targets.nodeIds[0] }
      : targets.segmentIds.length
        ? { kind: 'SEGMENT', id: targets.segmentIds[0] }
        : null;
    this.message = targets.visibleTargetCount
      ? 'Located finding ' + finding.findingId + ' in source geometry.'
      : 'Finding ' + finding.findingId + ': no exact renderable source identity. No inferred node is editable.';
    if (edit && this.selection?.kind === 'SEGMENT') {
      this.message += ' Select the correct endpoint node to edit; no automatic relocation.';
    }
    this.render();
    if (this.selection) this.focusCurrentSelection();
    this.section.scrollIntoView?.({ block: 'nearest' });
    return targets.visibleTargetCount > 0;
  }

  geometry(pre) {
    return buildLfeaGeometryReview(pre, { source: { kind: 'ACCDB' } }, this.representation);
  }

  viewKey() { return this.representation + ':' + this.verticalAxis; }

  currentViewBox() {
    return this.viewBoxByMode.get(this.viewKey()) ?? LFEA_GEOMETRY_DEFAULT_VIEW_BOX;
  }

  /** Existing renderer uses a fixed 760x420 projected coordinate frame. */
  focusCurrentSelection() {
    if (!this.selection) return;
    const svg = this.section?.querySelector('[data-role="lfea-accdb-repair-svg-host"] svg');
    if (!svg) return;
    const key = this.selection.kind === 'NODE' ? 'nodeId' : 'segmentId';
    const mark = [...svg.querySelectorAll('[data-' + (key === 'nodeId' ? 'node-id' : 'segment-id') + ']')]
      .find((el) => el.dataset[key] === this.selection.id
        && (el.tagName.toLowerCase() === 'circle' || el.tagName.toLowerCase() === 'line'));
    if (!mark) return;
    const x = mark.tagName.toLowerCase() === 'circle'
      ? Number(mark.getAttribute('cx'))
      : (Number(mark.getAttribute('x1')) + Number(mark.getAttribute('x2'))) / 2;
    const y = mark.tagName.toLowerCase() === 'circle'
      ? Number(mark.getAttribute('cy'))
      : (Number(mark.getAttribute('y1')) + Number(mark.getAttribute('y2'))) / 2;
    if (![x, y].every(Number.isFinite)) return;
    const { width, height } = LFEA_GEOMETRY_DEFAULT_VIEW_BOX;
    const narrowed = { x: x - width * 0.3 / 2, y: y - height * 0.3 / 2,
      width: width * 0.3, height: height * 0.3 };
    this.viewBoxByMode.set(this.viewKey(), narrowed);
    this.render();
  }

  findExactSourceObject() {
    const active = this.active();
    if (!active) return;
    const descriptor = this.geometry(active.pre).selected;
    const query = this.searchTerm.trim().toUpperCase();
    if (!query) throw new TypeError('Enter a source node, span or ACCDB element ID.');
    const node = descriptor.nodes.find((entry) => entry.nodeId.toUpperCase() === query);
    if (node) {
      this.selectNode(node);
      this.focusCurrentSelection();
      return;
    }
    let segment = descriptor.segments.find((entry) => entry.segmentId.toUpperCase() === query);
    if (!segment && this.representation === 'SOURCE') {
      const records = active.source.elementRecords.filter((record) =>
        String(record.accdbElementId).toUpperCase() === query
        || String(record.sourceFeatureId).toUpperCase() === query);
      if (records.length === 1) {
        segment = descriptor.segments.find((entry) =>
          entry.segmentId === records[0].canonicalSegmentId);
      }
    }
    if (!segment) throw new TypeError('No exact ' + this.representation
      + ' source object found for ' + this.searchTerm + '. No nearest-object guess was made.');
    this.selectSegment(segment);
    this.focusCurrentSelection();
  }

  /**
   * Follow an existing bend-retopology source ID only when it resolves to a
   * retained imported segment. Derived analysis nodes must never be edited.
   */
  exactSourceAncestor(kind, id, pre) {
    const geometry = pre?.preparation?.structuralPreparation?.conditionedTopology?.geometry;
    const collection = kind === 'NODE' ? geometry?.nodes : geometry?.segments;
    const raw = collection?.find((row) => String(row.id) === String(id));
    if (!raw) return null;
    const meta = raw.meta ?? {};
    const lineage = kind === 'NODE'
      ? (meta.bendRetopologyOf ?? meta.bendWorkingPointOf)
      : (meta.bendChordOf ?? meta.parentSegmentId);
    const exact = String(lineage ?? '');
    if (!exact) return null;
    const source = this.geometry(pre).representations.SOURCE;
    return source.segments.some((row) => row.segmentId === exact) ? exact : null;
  }

  showExactSourceAncestor(segmentId) {
    const pre = this.active()?.pre;
    if (!pre) throw new TypeError('No active ACCDB model.');
    this.representation = 'SOURCE';
    const source = this.geometry(pre).selected;
    const segment = source.segments.find((row) => row.segmentId === segmentId);
    if (!segment) throw new TypeError('Conditioned source lineage no longer matches imported geometry.');
    this.selectSegment(segment);
    this.focusCurrentSelection();
    this.message = 'Exact retained source span ' + segmentId
      + ' located from analysis retopology. Analysis-only nodes remain read-only.';
    this.render();
  }

  selectNode(node) {
    this.selection = { kind: 'NODE', id: node.nodeId };
    this.pending = null;
    this.pendingProperty = null;
    this.axis = 'X';
    this.rawValue = '';
    this.message = 'Source node ' + node.nodeId + ' selected.';
    this.render();
  }

  selectSegment(segment) {
    this.selection = { kind: 'SEGMENT', id: segment.segmentId };
    this.pending = null;
    this.pendingProperty = null;
    this.message = 'Segment ' + segment.segmentId + ' selected. Choose a source endpoint to edit.';
    this.render();
  }

  previewCoordinate() {
    const active = this.active();
    if (!active || this.selection?.kind !== 'NODE' || this.representation !== 'SOURCE') {
      throw new TypeError('Select an imported ACCDB source node, not a derived analysis node.');
    }
    const current = active.editor.getCoordinateEditorSnapshot();
    this.pending = active.editor.previewCoordinateEdit({
      nodeId: this.selection.id, axis: this.axis, value: this.rawValue,
      unit: current.unit, expectedSourceIdentity: current.sourceIdentity,
      expectedRevision: current.revision,
    });
    this.error = '';
    this.message = this.pending.changed
      ? 'Preview only: ' + this.pending.changes.length + ' raw source cell(s) will change. No preflight has been changed.'
      : 'No effective change after FLOAT32 rounding; nothing to apply.';
    this.render();
  }

  applyCoordinate() {
    if (!this.pending?.changed) throw new TypeError('Preview a changed coordinate before Apply.');
    const active = this.active();
    if (!active) throw new TypeError('The ACCDB source was replaced.');
    active.editor.applyCoordinateEdit({
      nodeId: this.pending.nodeId, axis: this.pending.axis,
      value: this.pending.after, unit: this.pending.unit,
      expectedSourceIdentity: this.pending.sourceIdentity,
      expectedRevision: this.pending.revision,
      approver: this.approver, reason: this.reason,
    });
    this.pending = null;
    this.focusedFinding = null;
    this.error = '';
    this.message = 'Applied to preparation input tables; fresh diagnostics are shown. Previous run evidence is invalidated.';
    this.refresh();
  }

  propertyEditRequest(record, pre, editor) {
    const snapshot = editor.getCoordinateEditorSnapshot();
    return {
      accdbElementId: record.accdbElementId,
      field: this.field, rawValue: this.propertyValue,
      approver: this.approver, reason: this.reason,
      expectedSourceIdentity: snapshot.sourceIdentity,
      expectedCoordinateRevision: snapshot.revision,
      expectedPreparationHash: pre.semanticHash,
    };
  }

  previewProperty(record) {
    const active = this.active();
    if (!active || this.representation !== 'SOURCE') throw new TypeError('Select an imported ACCDB element.');
    this.pendingProperty = active.editor.previewPropertyFieldEdit(
      this.propertyEditRequest(record, active.pre, active.editor));
    this.error = '';
    this.message = 'Property preview evaluated through the existing raw-cell whitelist; preparation remains unchanged.';
    this.render();
  }

  applyProperty(record) {
    const active = this.active();
    if (!active || this.representation !== 'SOURCE' || !this.pendingProperty?.changed) {
      throw new TypeError('Preview a supported changed source property before Apply.');
    }
    const request = this.propertyEditRequest(record, active.pre, active.editor);
    if (this.pendingProperty.sourceIdentity !== request.expectedSourceIdentity
        || this.pendingProperty.revision !== request.expectedCoordinateRevision
        || this.pendingProperty.expectedPreparationHash !== request.expectedPreparationHash
        || this.pendingProperty.elementId !== String(request.accdbElementId)
        || this.pendingProperty.field !== request.field
        || String(this.pendingProperty.after) !== String(request.rawValue)) {
      throw new TypeError('Property changed after preview; preview the current source again.');
    }
    active.editor.applyPropertyFieldEdit(request);
    this.pendingProperty = null;
    this.pending = null;
    this.focusedFinding = null;
    this.message = 'Source raw property applied through governed ACCDB whitelist; fresh preparation, new run authorization required.';
    this.refresh();
  }

  history(direction) {
    const active = this.active();
    if (!active) return;
    if (!active.editor.navigateCoordinateHistory(direction)) return;
    this.pending = null;
    this.focusedFinding = null;
    this.message = direction < 0 ? 'Undo committed; fresh preflight.' : 'Redo committed; fresh preflight.';
    this.refresh();
  }

  saveDraft() {
    const active = this.active();
    if (!active) throw new TypeError('No source-bound draft.');
    const json = active.editor.exportCoordinateDraft();
    const view = this.doc.defaultView;
    if (!view?.Blob || !view.URL?.createObjectURL) {
      throw new TypeError('This browser does not support local JSON draft export.');
    }
    const blob = new view.Blob([json], { type: 'application/json' });
    const url = view.URL.createObjectURL(blob);
    try {
      const anchor = this.doc.createElement('a');
      anchor.href = url;
      anchor.download = 'AA3-ACCDB-coordinate-corrections.json';
      anchor.click();
    } finally {
      view.URL.revokeObjectURL(url);
    }
  }

  async importDraft(file) {
    if (!file || typeof file.text !== 'function') return;
    const json = await file.text();
    const active = this.active();
    if (!active) throw new TypeError('Import the original ACCDB before loading a saved draft.');
    const result = active.editor.previewImportedCoordinateDraft(json);
    this.loadedDraft = JSON.stringify(result.draft);
    this.pending = null;
    this.message = 'Saved correction loaded for preview: ' + result.replay.disclosures.length
      + ' coordinate change(s). Review, then Apply with current approver and reason.';
    this.render();
  }

  applyImportedDraft() {
    const active = this.active();
    if (!active || !this.loadedDraft) throw new TypeError('Load and preview a matching correction draft.');
    active.editor.applyImportedCoordinateDraft(this.loadedDraft,
      { approver: this.approver, reason: this.reason });
    this.loadedDraft = null;
    this.pending = null;
    this.focusedFinding = null;
    this.message = 'Saved correction applied and full preparation regenerated; authorization does not carry forward.';
    this.refresh();
  }

  run(action) {
    try { action(); } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
      this.render();
    }
  }

  button(text, action, handler, disabled = false) {
    const b = this.doc.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.dataset.action = action;
    b.disabled = disabled;
    b.addEventListener('click', () => this.run(handler));
    return b;
  }

  textInput(label, value, onInput, role) {
    const wrap = this.doc.createElement('label');
    wrap.textContent = label;
    const input = this.doc.createElement('input');
    input.type = 'text';
    input.dataset.role = role;
    input.value = value == null ? '' : String(value);
    input.addEventListener('input', () => onInput(input.value));
    wrap.append(input);
    return { wrap, input };
  }

  selectInput(label, items, value, onChange, role) {
    const wrap = this.doc.createElement('label');
    wrap.textContent = label;
    const select = this.doc.createElement('select');
    select.dataset.role = role;
    for (const item of items) {
      const opt = this.doc.createElement('option');
      opt.value = item;
      opt.textContent = item;
      select.append(opt);
    }
    select.value = value;
    select.addEventListener('change', () => onChange(select.value));
    wrap.append(select);
    return { wrap, select };
  }

  render() {
    if (!this.section) return;
    const active = this.active();
    this.section.hidden = !active;
    this.section.replaceChildren();
    if (!active) return;
    const { pre, source, editor } = active;
    const snap = editor.getCoordinateEditorSnapshot();
    const geom = this.geometry(pre);
    const descriptor = geom.selected;
    const shell = this.doc.createElement('div');
    shell.className = 'lfea-accdb-repair-workspace__toolbar';
    const heading = this.doc.createElement('h3');
    heading.textContent = 'Piping model · source-bound correction workspace';
    const caption = this.doc.createElement('p');
    caption.dataset.role = 'lfea-accdb-repair-identity';
    caption.textContent = source.fileName + ' · ' + descriptor.label + ' · ' + snap.unit
      + ' (raw correction unit; viewport ' + (descriptor.unit ?? 'm') + ') · preflight ' + pre.status
      + ' · imported 11-table intake SHA ' + String(snap.sourceIdentity).slice(0, 16)
      + ' · original ACCDB byte ' + String(snap.originalAccdbByteSha256).slice(0, 24);
    shell.append(heading, caption);
    for (const representation of ['SOURCE', 'ANALYSIS']) {
      shell.append(this.button(representation === 'SOURCE' ? 'Imported source' : 'Conditioned analysis',
        'lfea-repair-representation-' + representation, () => {
          this.representation = representation;
          this.selection = null;
          this.pending = null;
          this.render();
        }));
    }
    for (const axis of ['Y', 'Z']) {
      shell.append(this.button('Vertical ' + axis, 'lfea-repair-axis-' + axis, () => {
        this.verticalAxis = axis;
        this.render();
      }));
    }
    shell.append(
      this.button('Fit whole model', 'lfea-repair-fit', () => {
        this.viewBoxByMode.delete(this.viewKey()); this.render();
      }),
      this.button('Zoom in', 'lfea-repair-zoom-in', () => {
        this.viewBoxByMode.set(this.viewKey(),
          zoomLfeaGeometryViewBox(this.currentViewBox(), 1 / LFEA_GEOMETRY_BUTTON_ZOOM_FACTOR));
        this.render();
      }),
      this.button('Zoom out', 'lfea-repair-zoom-out', () => {
        this.viewBoxByMode.set(this.viewKey(),
          zoomLfeaGeometryViewBox(this.currentViewBox(), LFEA_GEOMETRY_BUTTON_ZOOM_FACTOR));
        this.render();
      }),
    );
    const search = this.textInput('Find exact node, segment or ACCDB ELEMENTID ',
      this.searchTerm, (term) => { this.searchTerm = term; }, 'lfea-repair-object-search');
    search.input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') this.run(() => this.findExactSourceObject());
    });
    shell.append(search.wrap, this.button('Find in model', 'lfea-repair-find', () =>
      this.findExactSourceObject()));
    const svgHost = this.doc.createElement('div');
    svgHost.className = 'lfea-accdb-repair-workspace__svg';
    svgHost.dataset.role = 'lfea-accdb-repair-svg-host';
    const loc = this.focusedFinding
      ? resolveLfeaAccdbFindingTargets(this.focusedFinding, source, descriptor)
      : null;
    const selectedSegmentId = this.selection?.kind === 'SEGMENT' ? this.selection.id : null;
    const selectedNodeId = this.selection?.kind === 'NODE' ? this.selection.id : null;
    renderLfeaGeometryReviewSvg(svgHost, descriptor, {
      verticalAxis: this.verticalAxis,
      highlightSegmentIds: [...(loc?.segmentIds ?? []), selectedSegmentId].filter(Boolean),
      highlightNodeIds: [...(loc?.nodeIds ?? []), selectedNodeId].filter(Boolean),
      onSelectSegment: (segment) => this.selectSegment(segment),
      onSelectNode: (node) => this.selectNode(node),
      viewBox: this.currentViewBox(),
      onViewBoxChange: (box) => this.viewBoxByMode.set(this.viewKey(), { ...box }),
    });
    if (loc) {
      const evidence = this.doc.createElement('p');
      evidence.dataset.role = 'lfea-accdb-finding-location';
      evidence.textContent = 'Finding ' + this.focusedFinding.findingId + ' · ' + loc.targetStatus
        + ' · exact segments ' + loc.segmentIds.join(', ')
        + ' · exact nodes ' + loc.nodeIds.join(', ');
      shell.append(evidence);
    }
    const inspector = this.doc.createElement('div');
    inspector.className = 'lfea-accdb-repair-workspace__inspector';
    inspector.dataset.role = 'lfea-accdb-repair-inspector';
    if (!this.selection) {
      const p = this.doc.createElement('p');
      p.textContent = 'Choose one finding occurrence, then a highlighted segment or node. Source input fields alone are editable; the analysis representation is read-only.';
      inspector.append(p);
    } else if (this.selection.kind === 'SEGMENT') {
      this.renderSegmentInspector(inspector, active, descriptor);
    } else {
      this.renderNodeInspector(inspector, active, descriptor);
    }
    const history = this.doc.createElement('div');
    history.className = 'lfea-accdb-repair-workspace__history';
    history.append(
      this.button('Undo', 'lfea-repair-undo', () => this.history(-1), !snap.undoCount),
      this.button('Redo', 'lfea-repair-redo', () => this.history(1), !snap.redoCount),
      this.button('Save correction draft', 'lfea-repair-save', () => this.saveDraft()),
    );
    const upload = this.doc.createElement('label');
    upload.textContent = 'Load saved draft ';
    const fileInput = this.doc.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json,application/json';
    fileInput.dataset.role = 'lfea-repair-load-file';
    fileInput.addEventListener('change', () => {
      this.importDraft(fileInput.files?.[0]).catch((error) => {
        this.error = error instanceof Error ? error.message : String(error);
        this.render();
      });
    });
    upload.append(fileInput);
    history.append(upload);
    const ledger = this.doc.createElement('ol');
    ledger.dataset.role = 'lfea-accdb-correction-ledger';
    ledger.setAttribute('aria-label', 'Applied coordinate corrections and source provenance');
    for (const disclosure of snap.disclosures) {
      const line = this.doc.createElement('li');
      line.textContent = 'Source node ' + disclosure.nodeId + ' · ' + disclosure.axis
        + ': ' + disclosure.before + ' → ' + disclosure.after + ' ' + disclosure.unit
        + ' · ' + disclosure.changes.length + ' raw table cells changed'
        + ' · incident ACCDB elements ' + disclosure.affectedElementIds.join(', ');
      ledger.append(line);
    }
    history.append(ledger);
    if (this.loadedDraft) {
      history.append(this.button('Apply loaded draft after review', 'lfea-repair-apply-loaded', () =>
        this.applyImportedDraft()));
    }
    const custody = this.doc.createElement('div');
    custody.className = 'lfea-accdb-repair-workspace__custody';
    custody.append(
      this.textInput('Engineer / approver ', this.approver, (v) => { this.approver = v; }, 'lfea-repair-approver').wrap,
      this.textInput('Correction reason ', this.reason, (v) => { this.reason = v; }, 'lfea-repair-reason').wrap,
    );
    const status = this.doc.createElement('output');
    status.dataset.role = 'lfea-accdb-repair-status';
    status.dataset.status = this.error ? 'error' : 'ok';
    status.textContent = this.error || this.message
      || 'Original ACCDB bytes remain unchanged. All Apply/Undo/Redo operations regenerate the governed preflight.';
    this.section.append(shell, svgHost, inspector, custody, history, status);
  }

  renderSegmentInspector(host, active, descriptor) {
    const segment = descriptor.segments.find((s) => s.segmentId === this.selection.id);
    if (!segment) return;
    const record = sourceElementForSegment(segment, active.source);
    const title = this.doc.createElement('strong');
    title.textContent = segment.segmentId + ' · ' + segment.type + ' · '
      + segment.startNodeId + ' → ' + segment.endNodeId;
    host.append(title);
    if (this.representation !== 'SOURCE' || !record) {
      const p = this.doc.createElement('p');
      p.textContent = 'Derived analysis segment or unresolved source identity — read-only. No inferred ACCDB field is editable.';
      host.append(p);
      if (this.representation === 'ANALYSIS') {
        const ancestor = this.exactSourceAncestor('SEGMENT', segment.segmentId, active.pre);
        if (ancestor) host.append(this.button('Show retained source span ' + ancestor,
          'lfea-repair-show-source-ancestor', () => this.showExactSourceAncestor(ancestor)));
      }
      return;
    }
    const sourceLabel = this.doc.createElement('p');
    sourceLabel.textContent = 'ACCDB ELEMENTID ' + record.accdbElementId + ' · synthetic ' + record.sourceFeatureId;
    host.append(sourceLabel);
    for (const id of [segment.startNodeId, segment.endNodeId]) {
      host.append(this.button('Select source node ' + id, 'lfea-repair-select-node', () =>
        this.selectNode({ nodeId: id })));
    }
    const fieldSelect = this.selectInput('Raw element field ',
      ACCDB_ELEMENT_FIELD_SPECS.map((spec) => spec.name), this.field, (name) => {
        this.field = name; this.propertyValue = ''; this.pendingProperty = null; this.render();
      }, 'lfea-repair-property-field');
    const evidence = record.fieldEvidence?.[this.field];
    const original = this.doc.createElement('p');
    original.dataset.role = 'lfea-repair-property-evidence';
    original.textContent = 'Imported/effective raw: ' + String(evidence?.rawValue ?? 'blank')
      + ' · disposition: ' + String(evidence?.disposition ?? 'unavailable')
      + ' · converted SI: ' + String(evidence?.canonicalValue ?? 'unavailable');
    const value = this.textInput('New value (ACCDB raw unit) ',
      this.propertyValue, (v) => { this.propertyValue = v; }, 'lfea-repair-property-value');
    host.append(fieldSelect.wrap, original, value.wrap,
      this.button('Preview governed property correction', 'lfea-repair-preview-property', () =>
        this.previewProperty(record)));
    if (this.pendingProperty && this.pendingProperty.elementId === String(record.accdbElementId)
        && this.pendingProperty.field === this.field) {
      const preview = this.doc.createElement('div');
      preview.dataset.role = 'lfea-accdb-property-preview';
      const text = this.doc.createElement('p');
      const check = this.pendingProperty;
      text.textContent = 'PREVIEW ONLY · INPUT_BASIC_ELEMENT_DATA ELEMENTID '
        + check.elementId + ' ' + check.field + ': ' + String(check.before)
        + ' → ' + String(check.after) + ' (source raw value) · '
        + check.overrideCount + ' total whitelisted field override(s). '
        + 'Preflight ' + check.statusBefore + ' → ' + check.statusAfter
        + '; finding occurrences ' + check.findingCountBefore + ' → '
        + check.findingCountAfter + '. Never accepts a mechanical limitation.';
      preview.append(text,
        this.button('Apply property correction and re-check', 'lfea-repair-apply-property',
          () => this.applyProperty(record), !check.changed),
        this.button('Cancel property preview', 'lfea-repair-cancel-property', () => {
          this.pendingProperty = null;
          this.message = 'Property correction canceled; ACCDB model unchanged.';
          this.render();
        }));
      host.append(preview);
    }
    const related = findingsForAccdbSelection(active.pre.preparation.findings,
      active.source, descriptor, this.selection);
    const note = this.doc.createElement('p');
    note.textContent = related.length + ' exact-source linked findings for this span. Property edits re-import and re-check; mechanical approximations remain governed separately.';
    host.append(note);
  }

  renderNodeInspector(host, active, descriptor) {
    const node = descriptor.nodes.find((row) => row.nodeId === this.selection.id);
    if (!node) return;
    const label = this.doc.createElement('strong');
    label.textContent = 'Node ' + this.selection.id + ' · (' + node.x + ', ' + node.y
      + ', ' + node.z + ') m';
    host.append(label);
    if (node.restraints?.length) {
      const support = this.doc.createElement('p');
      support.dataset.role = 'lfea-repair-support-inspection';
      support.textContent = node.restraints.map((entry) => String(entry.typeLabel)
        + ' (' + entry.actionSense + ')').join(' · ')
        + '. Source supports shown from ACCDB; exact friction/gap/unilateral mechanics are not editable here.';
      host.append(support);
    }
    if (this.representation !== 'SOURCE') {
      const p = this.doc.createElement('p');
      p.textContent = 'This analysis node may be generated or repositioned by conditioning. It is not a source-coordinate edit locator.';
      host.append(p);
      const ancestor = this.exactSourceAncestor('NODE', node.nodeId, active.pre);
      if (ancestor) host.append(this.button('Show retained source span ' + ancestor,
        'lfea-repair-show-source-ancestor', () => this.showExactSourceAncestor(ancestor)));
      else {
        const note = this.doc.createElement('p');
        note.textContent = 'No authenticated source-span lineage retained for this analysis node; source edit unavailable.';
        host.append(note);
      }
      return;
    }
    const raw = active.editor.getCoordinateRawValue(this.selection.id, this.axis);
    const select = this.selectInput('Coordinate axis ', ['X', 'Y', 'Z'], this.axis, (v) => {
      this.axis = v; this.rawValue = ''; this.pending = null; this.render();
    }, 'lfea-repair-coordinate-axis');
    const previous = this.doc.createElement('p');
    previous.textContent = 'Raw source ' + this.axis + ': ' + String(raw) + ' ' + active.editor.getCoordinateEditorSnapshot().unit;
    const value = this.textInput('Replacement in file unit ', this.rawValue,
      (v) => { this.rawValue = v; }, 'lfea-repair-coordinate-value');
    host.append(select.wrap, previous, value.wrap,
      this.button('Preview affected source cells', 'lfea-repair-preview', () => this.previewCoordinate()));
    if (this.pending) {
      const preview = this.doc.createElement('div');
      preview.dataset.role = 'lfea-accdb-coordinate-preview';
      const summary = this.doc.createElement('p');
      summary.textContent = 'Proposed node ' + this.pending.nodeId + ' ' + this.pending.axis + ': '
        + this.pending.before + ' → ' + this.pending.after + ' ' + this.pending.unit
        + (this.pending.quantized ? ' · rounded to source FLOAT32 precision' : '')
        + ' · affected elements: ' + this.pending.affectedElementIds.join(', ');
      preview.append(summary);
      const list = this.doc.createElement('ul');
      for (const change of this.pending.changes.slice(0, 30)) {
        const item = this.doc.createElement('li');
        item.textContent = change.table + '[' + change.row + '].' + change.field
          + ': ' + String(change.before) + ' → ' + String(change.after);
        list.append(item);
      }
      preview.append(list);
      if (this.pending.diagnosticPreview) {
        const next = this.pending.diagnosticPreview;
        const diagnostics = this.doc.createElement('div');
        diagnostics.dataset.role = 'lfea-accdb-diagnostic-preview';
        const headline = this.doc.createElement('p');
        headline.textContent = 'PREVIEW ONLY — governed preparation: ' + next.previousStatus
          + ' → ' + next.proposedStatus + '; finding occurrences '
          + next.previousFindingCount + ' → ' + next.proposedFindingCount
          + '; preparation hash changes: '
          + String(next.previousPreparationSemanticHash !== next.proposedPreparationSemanticHash)
          + '. This does not grant run or code authority.';
        diagnostics.append(headline);
        for (const difference of next.changedCodes.slice(0, 12)) {
          const line = this.doc.createElement('p');
          line.textContent = difference.code + ': ' + difference.before + ' → ' + difference.after;
          diagnostics.append(line);
        }
        if (next.changedCodes.length > 12) {
          const more = this.doc.createElement('p');
          more.textContent = (next.changedCodes.length - 12)
            + ' additional finding-code count changes; inspect the new Error Check after Apply.';
          diagnostics.append(more);
        }
        preview.append(diagnostics);
      }
      if (this.pending.changes.length > 30) {
        const notice = this.doc.createElement('p');
        notice.textContent = 'And ' + (this.pending.changes.length - 30)
          + ' more affected cells. Use source table custody to audit the full proposal.';
        preview.append(notice);
      }
      preview.append(
        this.button('Apply correction and re-check', 'lfea-repair-apply', () =>
          this.applyCoordinate(), !this.pending.changed),
        this.button('Cancel preview', 'lfea-repair-cancel', () => {
          this.pending = null; this.message = 'Correction preview canceled; model unchanged.'; this.render();
        }),
      );
      host.append(preview);
    }
    const related = findingsForAccdbSelection(active.pre.preparation.findings,
      active.source, descriptor, this.selection);
    const note = this.doc.createElement('p');
    note.textContent = related.length + ' exactly linked finding(s). Node relocation also moves attached restraints/components; inspect the preview and engineering consequences.';
    host.append(note);
  }

  getSnapshot() {
    return Object.freeze({
      schema: LFEA_ACCDB_REPAIR_WORKSPACE_SCHEMA,
      active: !!this.active(),
      representation: this.representation,
      selection: this.selection,
      focusedFindingId: this.focusedFinding?.findingId ?? null,
      previewReady: !!this.pending?.changed,
      sourceIdentity: this.sourceIdentity,
    });
  }

  destroy() {
    this.host.removeEventListener?.('lfea-source-presentation-refresh', this.onRefresh);
    this.section?.remove();
    this.section = null;
  }
}
