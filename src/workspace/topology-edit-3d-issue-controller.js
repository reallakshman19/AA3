/** Spatial issue-review composition over search, lifecycle, and certified autofix. */
import { EVENT_TOPICS } from './event-topics.js';
import {
  TopologyEdit3DViewController as SearchController,
} from './topology-edit-3d-search-controller.js';
import {
  createTopologyEditSelection,
  topologyEditSelectionDescription,
  updateTopologyEditSelection,
} from './topology-edit/topology-edit-command-ui.js';
import { TopologyEditCanvasCallout } from './topology-edit/topology-edit-canvas-callout.js';
import {
  buildHighConfidenceGapAutofixPlan,
  applyHighConfidenceGapAutofix as applyCertifiedHighConfidenceGapAutofix,
} from './topology-edit/topology-edit-high-confidence-autofix.js';
import {
  TOPOLOGY_EDIT_DEFAULT_AUTOFIX_GAP_MM,
  TOPOLOGY_EDIT_NEAR_MATCH_GAP_MM,
  requireTopologyEditAutofixGapMm,
} from './topology-edit/topology-edit-gap-autofix-policy.js';
import {
  buildTopologyEditIssueOverlay,
} from './topology-edit/topology-edit-issue-overlay.js';
import {
  topologyEditEntityIdsForObject,
} from './topology-edit/topology-edit-render-packet.js';
import {
  topologyEditPresentationActions,
} from './viewport-presentation/topology-edit-presentation-contract.js';
import {
  focusTopologyEditCanonicalIds,
} from './viewport-productivity/topology-edit-scene-focus.js';

const PRESENTATION_ACTIONS = topologyEditPresentationActions();

export class TopologyEdit3DViewController extends SearchController {
  constructor(eventBus, lifecycleOptions = {}) {
    super(eventBus, lifecycleOptions);
    this.issueOverlay = null;
    this.issueCallout = null;
    this.issueCalloutMount = null;
    this.highConfidenceGapToleranceMm = TOPOLOGY_EDIT_DEFAULT_AUTOFIX_GAP_MM;
  }

  buildShell() {
    super.buildShell();
    this.hostElement.style.position = 'relative';
    const mount = this.hostElement.ownerDocument.createElement('div');
    mount.dataset.role = 'topology-edit-issue-callout-layer';
    mount.style.position = 'absolute';
    mount.style.inset = '0';
    mount.style.pointerEvents = 'none';
    mount.style.overflow = 'hidden';
    this.hostElement.append(mount);
    this.issueCalloutMount = mount;
    this.issueCallout = new TopologyEditCanvasCallout(mount);
  }

  deactivate() {
    this.issueCallout?.destroy();
    this.issueCallout = null;
    this.issueCalloutMount = null;
    this.issueOverlay = null;
    this.viewportBackend?.clearIssues();
    super.deactivate();
  }

  handleCanvasPointer(event) {
    const pick = this.viewportBackend?.pickAt(event.clientX, event.clientY);
    if (!pick?.objectId || !this.session) return;
    if (pick.objectKind === 'issue') {
      this.showIssueById(pick.objectId, event.clientX, event.clientY);
      return;
    }
    this.applyCanonicalPick(pick, event.shiftKey);
  }

  handleHostClick(event) {
    if (event.target.closest('[data-action="autofix-high-confidence-gaps"]')) {
      return this.applyHighConfidenceGapFixes();
    }
    const showButton = event.target.closest('[data-show-topology-issue]');
    if (showButton) {
      const rect = this.hostElement.getBoundingClientRect();
      this.showIssueById(
        showButton.dataset.showTopologyIssue,
        rect.left + rect.width * 0.64,
        rect.top + Math.min(rect.height * 0.45, 320),
        showButton.dataset.issueOverlayHash,
      );
      return;
    }
    return super.handleHostClick(event);
  }

  applyCanonicalPick(pick, additive) {
    if (pick.objectKind === 'node' || pick.objectKind === 'component') {
      this.selection = updateTopologyEditSelection(
        this.selection,
        pick.objectId,
        additive,
      );
    }
    const entityIds = pick.workspaceEntityIds?.length
      ? pick.workspaceEntityIds
      : topologyEditEntityIdsForObject(
        this.session.currentTopology(),
        pick.objectId,
      );
    if (entityIds.length) {
      this.eventBus.publish(EVENT_TOPICS.VIEWPORT_SELECTION_REQUESTED, {
        entityId: entityIds[0],
        source: 'topology-edit-3d',
      });
    }
    this.presentationToolbar?.update(this.presentationState);
    this.setStatus(pickStatus(pick, this.selection));
    this.updateActionButtons();
  }

  renderCheckerPanel() {
    if (!this.checkerElement || !this.session) return;
    this.issueCallout?.hideCallout();
    this.issueOverlay = buildTopologyEditIssueOverlay({
      canonicalTopology: this.session.currentTopology(),
      issues: this.issues,
      suggestions: this.autofixSuggestions,
    });
    this.viewportBackend?.renderIssues(this.issueOverlay);
    const visualIssues = this.visualDiagnostics.map((row) => ({
      kind: row.code,
      message: row.message,
    }));
    const topologyFindingCount = this.issues.length;
    if (!topologyFindingCount && !visualIssues.length) {
      this.checkerElement.textContent = 'No topology findings or rendering evidence notes detected.';
      return;
    }
    const entries = new Map(
      this.issueOverlay.entries.map((entry) => [entry.issueId, entry]),
    );
    const topologyGroups = grouped3dTopologyFindingMarkup(
      this.issues,
      entries,
      this.issueOverlay.overlayHash,
    );
    const visualEvidence = grouped3dVisualEvidenceMarkup(visualIssues);
    const topoFixPlan = buildHighConfidenceGapAutofixPlan(
      this.issues,
      this.highConfidenceGapToleranceMm,
      TOPOLOGY_EDIT_NEAR_MATCH_GAP_MM,
    );
    const topoFix = topoFixMarkup(topoFixPlan);
    this.checkerElement.innerHTML = `
      <strong>${topologyFindingCount} topology finding(s); ${this.issueOverlay.anchoredIssueCount} spatial marker(s); ${this.autofixSuggestions.length} source-backed fix(es)</strong>
      ${topoFix}
      ${topologyFindingCount ? '' : '<p>No canonical topology findings require action.</p>'}
      <div class="topology-edit-3d-issue-groups">${topologyGroups}</div>
      ${visualEvidence}`;
  }

  setHighConfidenceGapToleranceMm(value) {
    this.highConfidenceGapToleranceMm = requireTopologyEditAutofixGapMm(value);
    if (this.checkerElement && this.session) this.renderCheckerPanel();
    return this.highConfidenceGapToleranceMm;
  }

  applyHighConfidenceGapFixes(exactToleranceMm) {
    if (!this.session || this.session.staleReason) {
      this.setStatus('TopoFix is unavailable while the topology edit session is stale.');
      return null;
    }
    try {
      const certifiedToleranceMm = this.setHighConfidenceGapToleranceMm(
        exactToleranceMm ?? this.highConfidenceGapToleranceMm,
      );
      this.cancelAutofix(true);
      const result = certifiedToleranceMm === TOPOLOGY_EDIT_DEFAULT_AUTOFIX_GAP_MM
        ? applyCertifiedHighConfidenceGapAutofix(this.session, this.issues)
        : applyCertifiedHighConfidenceGapAutofix(
          this.session,
          this.issues,
          certifiedToleranceMm,
        );
      this.selection = createTopologyEditSelection();
      this.refreshView(this.session.currentTopology());
      const rejected = result.rejected.length;
      const skipped = result.skipped.length;
      const remaining = result.remainingHighConfidenceGapIssueIds.length;
      this.setStatus(
        `TopoFix accepted ${result.applied.length} high-confidence gap merge(s)`
        + `${rejected ? `; ${rejected} rejected by certification` : ''}`
        + `${skipped ? `; ${skipped} already resolved` : ''}`
        + `${remaining ? `; ${remaining} <${certifiedToleranceMm} mm gap(s) remain` : `; no <${certifiedToleranceMm} mm gaps remain`}.`
      );
      return result;
    } catch (error) {
      this.setStatus(`TopoFix failed: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  showIssueById(issueId, screenX, screenY, expectedOverlayHash = null) {
    if (!this.issueOverlay
      || (expectedOverlayHash && expectedOverlayHash !== this.issueOverlay.overlayHash)) {
      this.setStatus('Issue review is stale; refresh the current topology checks.');
      return;
    }
    const entry = this.issueOverlay.entries
      .find((row) => row.issueId === issueId);
    if (!entry) {
      this.setStatus(`Issue ${issueId} is no longer present or has no spatial anchor.`);
      return;
    }
    this.issueCallout?.showIssue({
      entry,
      screenX,
      screenY,
      onPreviewFix: (current) => this.previewIssueFix(current),
      onFlyTo: (current) => this.focusIssue(current),
    });
    this.setStatus(`Reviewing ${entry.severity} ${entry.kind} at ${entry.anchorSource}.`);
  }

  previewIssueFix(entry) {
    const suggestion = this.autofixSuggestions.find((row) => (
      row.issueId === entry.issueId
      && row.suggestionHash === entry.suggestionHash
    ));
    if (!suggestion) {
      this.setStatus('The source-backed fix suggestion is stale; rerun the checker.');
      return;
    }
    this.previewAutofix(suggestion.suggestionHash);
  }

  focusIssue(entry) {
    if (!entry.canonicalIds.length) {
      this.setStatus(`Issue ${entry.issueId} has no canonical focus target.`);
      return;
    }
    let result = this.focusCanonicalIds(entry.canonicalIds);
    let visibilityReset = false;
    if (result.status !== 'FOCUSED') {
      this.applyPresentationAction({ type: PRESENTATION_ACTIONS.SHOW_ALL_IDS });
      visibilityReset = true;
      result = this.focusCanonicalIds(entry.canonicalIds);
    }
    if (result.status !== 'FOCUSED') {
      this.setStatus(`Issue targets are absent from the current visual projection: ${entry.canonicalIds.join(', ')}.`);
      return;
    }
    const firstId = result.foundIds[0];
    const entityIds = topologyEditEntityIdsForObject(
      this.session.currentTopology(),
      firstId,
    );
    if (entityIds.length) {
      this.eventBus.publish(EVENT_TOPICS.VIEWPORT_SELECTION_REQUESTED, {
        entityId: entityIds[0],
        source: 'topology-edit-issue-review',
      });
    }
    this.setStatus(
      `${visibilityReset ? 'Presentation visibility reset; ' : ''}`
      + `focused ${result.foundIds.length} canonical target(s) for ${entry.kind}.`,
    );
  }

  focusCanonicalIds(canonicalIds) {
    const result = focusTopologyEditCanonicalIds({
      groups: this.viewportBackend?.groups,
      camera: this.viewportBackend?.activeCamera,
      controls: this.viewportBackend?.controls,
      canonicalIds,
    });
    if (result.status === 'FOCUSED') this.viewportBackend?.invalidate('canonical-selection-focus');
    return result;
  }
}

function topoFixMarkup(plan) {
  const exactCount = plan.exactGapIssueIds.length;
  const nearCount = plan.nearGapIssueIds.length;
  if (!exactCount && !nearCount) return '';
  const actionLabel = plan.exactToleranceMm === TOPOLOGY_EDIT_DEFAULT_AUTOFIX_GAP_MM
    ? `TopoFix — AutoFix &lt;6 mm gaps (${exactCount})`
    : `TopoFix — AutoFix &lt;${escapeHtml(plan.exactToleranceMm)} mm gaps (${exactCount})`;
  const action = exactCount
    ? `<button type="button" data-action="autofix-high-confidence-gaps">${actionLabel}</button>`
    : '';
  return `<div class="topology-edit-topofix-summary" data-role="topology-edit-topofix-summary">
    ${action}
    <span>${exactCount} high-confidence gap(s) &lt;${escapeHtml(plan.exactToleranceMm)} mm; ${nearCount} gap(s) from ${escapeHtml(plan.exactToleranceMm)}–${escapeHtml(plan.nearToleranceMm)} mm require individual review. AutoFix changes only the certified draft journal; Undo remains available.</span>
  </div>`;
}

function issueRow(issue, entry, overlayHash) {
  const show = entry
    ? ` <button type="button" data-show-topology-issue="${escapeHtml(issue.id)}" data-issue-overlay-hash="${escapeHtml(overlayHash)}">Show in 3D</button>`
    : '';
  const preview = entry?.suggestionHash
    ? ` <button type="button" data-autofix-suggestion="${escapeHtml(entry.suggestionHash)}">Preview ${escapeHtml(entry.commandType)}</button>`
    : '';
  return `<li data-issue-kind="${escapeHtml(issue.kind)}" data-issue-id="${escapeHtml(issue.id)}"><strong>${escapeHtml(issue.severity)}</strong> ${escapeHtml(issue.kind)}: ${escapeHtml(issue.message)}${show}${preview}</li>`;
}

/** Render canonical checker findings separately from non-blocking visual derivation evidence. */
function grouped3dTopologyFindingMarkup(issues, entries, overlayHash) {
  return group3dIssues(issues, (issue) => `${issue.severity} ${issue.kind}`)
    .map((group) => issue3dGroupMarkup(
      group,
      (issue) => issueRow(issue, entries.get(issue.id), overlayHash),
    ))
    .join('');
}

/** Keep rendering provenance reviewable without presenting it as a topology defect. */
function grouped3dVisualEvidenceMarkup(visualIssues) {
  if (!visualIssues.length) return '';
  const visualGroups = group3dIssues(visualIssues, (issue) => issue.kind)
    .map((group) => issue3dGroupMarkup(
      group,
      (issue) => `<li>${escapeHtml(issue.kind)}: ${escapeHtml(issue.message)}</li>`,
    ))
    .join('');
  return `<details class="topology-edit-3d-visual-evidence" data-role="topology-edit-visual-evidence">
    <summary>Rendering evidence notes <span>${visualIssues.length}</span></summary>
    <p>Informational geometry-derivation provenance. These notes do not block TopoFix or load calculation.</p>
    <div class="topology-edit-3d-issue-groups">${visualGroups}</div>
  </details>`;
}

function group3dIssues(issues, keyForIssue) {
  const groups = issues.reduce((result, issue) => {
    const key = keyForIssue(issue);
    if (!result.has(key)) result.set(key, []);
    result.get(key).push(issue);
    return result;
  }, new Map());
  return [...groups.entries()]
    .map(([key, rows]) => ({ key, rows }))
    .sort((left, right) => left.key.localeCompare(right.key));
}

function issue3dGroupMarkup(group, rowMarkup) {
  return `<details class="topology-edit-3d-issue-group">
    <summary>${escapeHtml(group.key)} <span>${group.rows.length}</span></summary>
    <ul>${group.rows.map(rowMarkup).join('')}</ul>
  </details>`;
}

function pickStatus(pick, selection) {
  if (pick.objectKind === 'restraint') {
    return `Selected ${pick.restraintFamily || 'restraint'} ${pick.restraintId} on support ${pick.supportId}.`;
  }
  if (pick.objectKind === 'support') {
    return `Selected support ${pick.supportId || pick.objectId}.`;
  }
  return topologyEditSelectionDescription(selection);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}
