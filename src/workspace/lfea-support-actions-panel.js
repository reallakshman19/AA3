export const LFEA_SUPPORT_ACTIONS_PANEL_STATUS = Object.freeze({
  CURRENT: 'CURRENT',
  STALE: 'STALE',
  NO_ACTION: 'NO_ACTION',
  AXIS_DEGENERATE: 'AXIS_DEGENERATE',
});

const SIGN_CONVENTION_LABELS = Object.freeze({
  FORCE_ON_PIPE_FROM_INTERFACE: 'Force on pipe from interface',
  FORCE_ON_INTERFACE_FROM_PIPE: 'Force on interface from pipe',
});

export function projectLfeaSupportActionsForSelection(
  selection,
  publication,
  sourceContext,
  invalidated = false,
) {
  const entityId = String(selection?.entityId ?? '');
  if (!publication || !entityId) return noAction();
  if (invalidated) return stale('The model changed after this LFEA result was sealed.');
  const current = sourceContext ?? {
    sourceSemanticHash: publication.sourceSemanticHash,
    modelVersion: publication.modelVersion,
  };
  if (current.sourceSemanticHash !== publication.sourceSemanticHash
    || current.modelVersion !== publication.modelVersion) {
    return stale('This LFEA result belongs to a different 3D Edit model version.');
  }
  const action = publication.actions.find((candidate) => candidate.entityId === entityId) ?? null;
  if (!action) return noAction();
  if (action.loadCaseId !== publication.loadCaseId) {
    return stale('This recovered action belongs to a different load case.');
  }
  const signLabel = SIGN_CONVENTION_LABELS[action.reportingSignConvention];
  if (!signLabel) {
    return stale('This recovered action has no recognized reporting sign convention. Signed support loads are not displayed.');
  }
  const unit = publication.units.force;
  const provenance = Object.freeze([
    row('Reporting sign', `${signLabel} (${action.reportingSignConvention})`),
    row('Load case', publication.loadCaseId),
    row('Physical load case', publication.physicalLoadCaseHash),
    row('Model version', String(publication.modelVersion)),
    row('Execution', publication.executionHash),
    row('Analysis result', publication.analysisResultSemanticHash),
  ]);
  if (action.triadStatus === 'BLOCKED_AXIS_DEGENERATE') {
    const blocked = 'Blocked — axial parallel to vertical';
    return Object.freeze({
      status: LFEA_SUPPORT_ACTIONS_PANEL_STATUS.AXIS_DEGENERATE,
      message: blocked,
      rows: Object.freeze([
        row('Faxial', forceText(action.fAxial, unit)),
        row('Flateral', blocked),
        row('Fvertical', blocked),
        row('Triad status', action.triadStatus),
        ...provenance,
      ]),
    });
  }
  return Object.freeze({
    status: LFEA_SUPPORT_ACTIONS_PANEL_STATUS.CURRENT,
    message: 'Recovered support action for the current model and load case.',
    rows: Object.freeze([
      row('Faxial', forceText(action.fAxial, unit)),
      row('Flateral', forceText(action.fLateral, unit)),
      row('Fvertical', forceText(action.fVertical, unit)),
      row('Triad status', action.triadStatus),
      ...provenance,
    ]),
  });
}

export function renderLfeaSupportActions(
  documentRef,
  selection,
  publication,
  sourceContext,
  invalidated = false,
) {
  const projected = projectLfeaSupportActionsForSelection(
    selection,
    publication,
    sourceContext,
    invalidated,
  );
  const section = documentRef.createElement('section');
  section.className = 'analysis-result lfea-support-actions';
  section.dataset.role = 'lfea-support-actions';
  section.dataset.status = projected.status;
  const heading = documentRef.createElement('h3');
  heading.textContent = 'LFEA support actions';
  const status = documentRef.createElement('p');
  status.dataset.role = 'lfea-support-actions-status';
  status.textContent = projected.message;
  section.append(heading, status);
  if (projected.rows.length) {
    const rows = documentRef.createElement('dl');
    rows.className = 'properties-grid';
    for (const item of projected.rows) {
      const term = documentRef.createElement('dt');
      term.textContent = item.label;
      const value = documentRef.createElement('dd');
      value.textContent = item.value;
      rows.append(term, value);
    }
    section.append(rows);
  }
  return section;
}

function noAction() {
  return Object.freeze({
    status: LFEA_SUPPORT_ACTIONS_PANEL_STATUS.NO_ACTION,
    message: 'No recovered action for this selection.',
    rows: Object.freeze([]),
  });
}

function stale(message) {
  return Object.freeze({
    status: LFEA_SUPPORT_ACTIONS_PANEL_STATUS.STALE,
    message,
    rows: Object.freeze([]),
  });
}

function forceText(value, unit) {
  return `${String(value)} ${unit}`;
}

function row(label, value) {
  return Object.freeze({ label, value: String(value) });
}
