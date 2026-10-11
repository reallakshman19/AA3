import { buildLfeaGeometryReview } from '../lfea-model-review/lfea-geometry-review.js';
import { renderLfeaGeometryReviewSvg } from '../lfea-model-review/lfea-geometry-review-svg.js';
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
    this.selection = null;
    this.focusedFinding = null;
    this.sourceIdentity = null;
    this.pending = null;
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
      this.loadedDraft = null;
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
    this.section.scrollIntoView?.({ block: 'nearest' });
    return targets.visibleTargetCount > 0;
  }

  geometry(pre) {
    return buildLfeaGeometryReview(pre, { source: { kind: 'ACCDB' } }, this.representation);
  }

  selectNode(node) {
    this.selection = { kind: 'NODE', id: node.nodeId };
    this.pending = null;
    this.axis = 'X';
    this.rawValue = '';
    this.message = 'Source node ' + node.nodeId + ' selected.';
    this.render();
  }

  selectSegment(segment) {
    this.selection = { kind: 'SEGMENT', id: segment.segmentId };
    this.pending = null;
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

  applyProperty(record) {
    const active = this.active();
    if (!active || this.representation !== 'SOURCE') throw new TypeError('Only source-element raw fields are editable.');
    const editor = active.editor;
    editor.overrideApprover = this.approver;
    editor.overrideReason = this.reason;
    editor.setOverrideDraft(record.accdbElementId, this.field, this.propertyValue);
    editor.applyOverrides();
    const snapshot = editor.getSnapshot();
    if (snapshot.error) throw new TypeError(snapshot.error);
    this.pending = null;
    this.focusedFinding = null;
    this.message = 'Property raw-cell correction applied through the existing ACCDB whitelist and preflight.';
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
      + ' (raw correction unit) · preflight ' + pre.status
      + ' · original source ' + String(snap.sourceIdentity).slice(0, 16);
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
      p.textContent = 'Derived analysis segment or unresolved source identity — read-only. Use Imported source for an exact ACCDB locator.';
      host.append(p);
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
        this.field = name; this.propertyValue = ''; this.render();
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
      this.button('Apply property via governed override', 'lfea-repair-apply-property', () =>
        this.applyProperty(record)));
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
    if (this.representation !== 'SOURCE') {
      const p = this.doc.createElement('p');
      p.textContent = 'This analysis node may be derived by conditioning. It is not a source-coordinate edit locator.';
      host.append(p);
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
