import { LFEA_DIAGNOSTIC_PRESENTATION_SCHEMA } from './lfea-diagnostic-presentation.js';

/** Render the common governed-finding projection without deriving engineering state. */
export function renderLfeaDiagnosticPresentation(documentRef, root, presentation, options = {}) {
  if (!root || typeof root.append !== 'function') {
    throw new TypeError('LFEA diagnostic presentation view requires a render root.');
  }
  if (!presentation || presentation.schema !== LFEA_DIAGNOSTIC_PRESENTATION_SCHEMA) {
    throw new TypeError('LFEA diagnostic presentation view requires the common presentation schema.');
  }

  const section = documentRef.createElement('section');
  section.dataset.role = 'lfea-diagnostic-presentation';
  section.dataset.schema = presentation.schema;
  section.dataset.findingCount = String(presentation.findingCount);
  section.dataset.preFlightStatus = presentation.preFlightStatus ?? 'UNAVAILABLE';
  section.dataset.sourceKind = presentation.source.kind ?? 'UNSPECIFIED';

  const heading = documentRef.createElement('strong');
  heading.textContent = options.heading
    ?? `Governed findings — ${presentation.findingCount}`;
  section.append(heading);

  const summary = documentRef.createElement('p');
  summary.dataset.role = 'lfea-diagnostic-presentation-summary';
  summary.textContent = [
    `BLOCK ${presentation.counts.BLOCK}`,
    `CONDITIONAL ${presentation.counts.CONDITIONAL}`,
    `ADVISORY ${presentation.counts.ADVISORY}`,
    `PASS ${presentation.counts.PASS}`,
  ].join(' · ');
  section.append(summary);

  if (presentation.groups.length === 0) {
    const empty = documentRef.createElement('p');
    empty.textContent = 'No governed findings are retained.';
    section.append(empty);
    root.append(section);
    return section;
  }

  const list = documentRef.createElement('ul');
  list.dataset.role = 'lfea-diagnostic-presentation-groups';
  for (const group of presentation.groups) {
    const item = documentRef.createElement('li');
    item.dataset.code = group.code;
    item.dataset.category = group.category;
    item.dataset.disposition = group.disposition;
    item.dataset.presentationLevel = group.presentationLevel;
    item.dataset.count = String(group.count);
    item.dataset.findingIds = group.findingIds.join(',');

    const details = documentRef.createElement('details');
    const groupHeading = documentRef.createElement('summary');
    groupHeading.textContent = `${group.presentationLabel} · ${group.plainMessage} (${group.count}× · ${group.code})`;
    details.append(groupHeading);

    const exact = documentRef.createElement('p');
    exact.dataset.role = 'lfea-diagnostic-presentation-authority-message';
    exact.textContent = group.message;
    details.append(exact);

    if (group.findingIds.length > 0) {
      const ids = documentRef.createElement('p');
      ids.dataset.role = 'lfea-diagnostic-presentation-finding-ids';
      ids.textContent = `Finding ID${group.findingIds.length === 1 ? '' : 's'}: ${group.findingIds.join(', ')}`;
      details.append(ids);
    }
    if (group.sourceFeatureIds.length > 0) {
      const entities = documentRef.createElement('p');
      entities.dataset.role = 'lfea-diagnostic-presentation-source-features';
      entities.textContent = `Affected: ${group.sourceFeatureIds.join(', ')}`;
      details.append(entities);
    }
    if (group.remediation) {
      const remediation = documentRef.createElement('p');
      remediation.dataset.role = 'lfea-diagnostic-presentation-remediation';
      remediation.textContent = `Remediation: ${group.remediation}`;
      details.append(remediation);
    }

    item.append(details);
    list.append(item);
  }
  section.append(list);
  root.append(section);
  return section;
}
