

import { cell, severityWord } from './lfea-accdb-panel-utils.js';
export function renderFindingGroups(doc, root, controller) {
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

export function findingGroupList(doc, groups) {
  const list = doc.createElement('ul');
  list.dataset.role = 'lfea-pipeline-accdb-finding-groups';
  for (const group of groups) {
    const item = doc.createElement('li');
    item.dataset.severity = group.severity;
    item.dataset.code = group.code;
    item.dataset.count = String(group.count);

    const details = doc.createElement('details');
    const summary = doc.createElement('summary');
    const scopedNote = group.scopedByProfile ? ' · accepted for the selected profile' : '';
    // Plain English first, because that is what tells the reader whether this
    // row matters. The code follows it for anyone who needs to refer to it.
    summary.textContent = `${severityWord(group.severity)} · ${group.plainMessage} (${group.count}× · ${group.code})${scopedNote}`;
    details.append(summary);

    // The pipeline's own precise wording, plus the affected elements: the
    // per-element repeats say the same sentence, so it is printed once and
    // the identities are listed rather than re-printed 96 times.
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
 * Every field shows the raw cell in the file's own declared unit next to the
 * converted value the analysis uses, and its disposition, so an inherited or
 * blank-sentinel value is never mistaken for a value the file declared. The
 * override input writes the raw cell, in the file's unit -- stated on the
 * form rather than left to be inferred.
 */
