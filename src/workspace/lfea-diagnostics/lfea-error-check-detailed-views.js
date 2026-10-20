/**
 * LFEA Error Check Detailed Diagnostic Views
 *
 * Renders categorized finding lists, triage banner, filter buttons,
 * and inline component basis controls.
 */

import {
  LFEA_COMPONENT_FACTOR_AUTHORITY_CODES,
  LFEA_ERROR_CHECK_CATEGORIES,
  LFEA_LIMITATION_KIND,
} from './lfea-error-check-presentation.js';
import { classifyLfeaAccdbFindingAction } from './lfea-accdb-capability-actions.js';
import { mountLfeaInlineBendFactorAuthorityControl } from '../lfea-bend-factor-authority-control.js';
import { lfeaPipelineIcon } from '../lfea-pipeline-icon-manifest.js';
import { renderOccurrenceFinder } from './lfea-error-check-occurrence-finder.js';

export { renderOccurrenceFinder };

export function renderFilters(controller, root) {
  root.replaceChildren();
  const categories = [
    Object.freeze({ categoryId: 'ALL', title: 'All' }),
    ...LFEA_ERROR_CHECK_CATEGORIES.filter((entry) =>
      controller.presentation.sections.some((section) => section.categoryId === entry.categoryId)),
  ];
  for (const category of categories) {
    const button = controller.documentRef.createElement('button');
    button.type = 'button';
    button.dataset.action = 'lfea-error-check-category-filter';
    button.dataset.categoryId = category.categoryId;
    button.dataset.active = category.categoryId === controller.activeCategory ? 'true' : 'false';
    button.textContent = category.title;
    button.addEventListener('click', () => controller.setCategoryFilter(category.categoryId));
    root.append(button);
  }
}

export function renderTriageBanner(doc, presentation) {
  const banner = doc.createElement('div');
  banner.className = 'lfea-common-error-check__triage';
  banner.dataset.role = 'lfea-common-error-check-triage';
  for (const bucket of presentation.triage) {
    const card = doc.createElement('div');
    card.className = 'lfea-common-error-check__triage-card';
    card.dataset.role = 'lfea-common-error-check-triage-card';
    card.dataset.triageId = bucket.triageId;
    card.dataset.cleared = bucket.cleared ? 'true' : 'false';

    const count = doc.createElement('strong');
    count.dataset.role = 'lfea-common-error-check-triage-count';
    count.textContent = bucket.cleared ? '0' : String(bucket.distinctIssueCount);
    const title = doc.createElement('span');
    title.className = 'lfea-common-error-check__triage-title';
    title.textContent = bucket.title;
    const detail = paragraph(doc, bucket.cleared
      ? bucket.clearedText
      : `${bucket.distinctIssueCount} distinct · ${bucket.findingCount} occurrence${bucket.findingCount === 1 ? '' : 's'}`);
    detail.className = 'lfea-common-error-check__triage-detail';
    card.append(count, title, detail);
    banner.append(card);
  }
  return banner;
}

export function renderCategory(controller, category) {
  const doc = controller.documentRef;
  const section = doc.createElement('section');
  section.className = 'lfea-common-error-check__category';
  section.dataset.role = 'lfea-common-error-check-category';
  section.dataset.categoryId = category.categoryId;

  const heading = doc.createElement('h4');
  const distinct = category.groups.length;
  heading.textContent = `${category.title} — ${distinct} distinct issue${distinct === 1 ? '' : 's'}`;
  const counts = paragraph(doc, `${category.findingCount} occurrence${category.findingCount === 1 ? '' : 's'} across ${distinct === 1 ? 'it' : 'them'}`);
  counts.dataset.role = 'lfea-common-error-check-category-counts';
  section.append(heading, counts);

  const list = doc.createElement('div');
  list.className = 'lfea-common-error-check__findings';
  for (const group of category.groups) {
    list.append(renderGroup(controller, group));
  }
  section.append(list);
  return section;
}

export function renderGroup(controller, group) {
  const doc = controller.documentRef;
  const card = doc.createElement('article');
  card.className = 'lfea-common-error-check__finding';
  card.dataset.role = 'lfea-common-error-check-finding-group';
  card.dataset.groupCode = group.code;
  card.dataset.disposition = group.disposition;
  card.dataset.presentationLevel = group.presentationLevel;
  card.dataset.triageId = group.triageId;
  card.dataset.occurrences = String(group.occurrences);
  if (group.limitationKind) card.dataset.limitationKind = group.limitationKind;

  const details = doc.createElement('details');
  details.className = 'lfea-common-error-check__finding-details';
  details.open = controller.openGroupIds.has(group.groupId);
  details.addEventListener('toggle', () => {
    if (details.open) {
      controller.openGroupIds.add(group.groupId);
      if (group.disposition === 'CONDITIONAL' && !controller.presentation.solveAuthorized
        && !controller.navigationOnlyGroupIds.has(group.groupId)) {
        controller.markLimitationReviewed(group.groupId);
      }
    } else {
      controller.openGroupIds.delete(group.groupId);
      controller.navigationOnlyGroupIds.delete(group.groupId);
    }
  });

  const summary = doc.createElement('summary');
  const badge = doc.createElement('span');
  badge.className = 'lfea-common-error-check__badge';
  badge.dataset.role = 'lfea-common-error-check-occurrence-badge';
  badge.textContent = group.occurrences > 1 ? `${group.occurrences}×` : '1×';
  const text = doc.createElement('span');
  text.className = 'lfea-common-error-check__finding-text';
  text.textContent = group.plainMessage;
  const disposition = doc.createElement('span');
  disposition.className = 'lfea-common-error-check__disposition';
  disposition.dataset.disposition = group.disposition;
  disposition.textContent = group.disposition === 'PASS' ? 'PASS · INFO' : group.disposition;
  summary.append(badge, text, disposition);

  if (group.disposition === 'CONDITIONAL') {
    const kind = doc.createElement('span');
    kind.className = 'lfea-common-error-check__limitation-kind';
    kind.dataset.limitationKind = group.limitationKind;
    kind.textContent = group.limitationKind === LFEA_LIMITATION_KIND.PROCESS_NOTE
      ? 'About this pass'
      : 'Affects the result';
    summary.append(kind);
    if (controller.presentation.solveAuthorized || controller.acknowledgedGroupIds.has(group.groupId)) {
      const reviewed = doc.createElement('span');
      reviewed.className = 'lfea-common-error-check__reviewed';
      reviewed.dataset.role = 'lfea-common-error-check-reviewed';
      reviewed.textContent = controller.presentation.solveAuthorized ? 'Accepted' : 'Reviewed';
      summary.append(reviewed);
    }
  }
  details.append(summary);

  if (group.suggestedAction) {
    const action = paragraph(doc, group.suggestedAction);
    action.className = 'lfea-common-error-check__action';
    action.dataset.role = 'lfea-common-error-check-suggested-action';
    details.append(action);
  }

  if (controller.preFlight?.diagnostics?.sourceBundle?.sourceKind === 'ACCDB') {
    const mapped = classifyLfeaAccdbFindingAction(group.code);
    const route = labelledParagraph(doc, 'Actual ACCDB action',
      `${mapped.actionClass} — ${mapped.action}`, 'lfea-accdb-finding-action-class');
    route.dataset.actionClass = mapped.actionClass;
    details.append(route);
    if (mapped.nextStep && typeof controller.options.onNavigatePrerequisite === 'function') {
      const go = actionButton(doc, `Go to ${mapped.nextStep === 'LOAD_CASE' ? 'Load case' : mapped.nextStep}`,
        'icon-step-load-case');
      go.dataset.action = 'lfea-error-check-next-step';
      go.addEventListener('click', () => controller.options.onNavigatePrerequisite(mapped.nextStep));
      details.append(go);
    }
  }

  details.append(labelledParagraph(doc, 'Applies to',
    `${group.occurrences} location${group.occurrences === 1 ? '' : 's'}`,
    'lfea-common-error-check-occurrences'));
  if (group.sourceFeatureIds.length > 0) {
    details.append(labelledParagraph(doc, 'Source features',
      summarizeList(group.sourceFeatureIds), 'lfea-common-error-check-source-features'));
  }
  details.append(renderOccurrenceFinder(controller, group));

  const technical = doc.createElement('div');
  technical.className = 'lfea-common-error-check__technical';
  technical.dataset.role = 'lfea-error-check-technical-details';
  technical.hidden = true;
  const technicalToggle = doc.createElement('button');
  technicalToggle.type = 'button';
  technicalToggle.textContent = 'Technical details · evidence and governed source references';
  technicalToggle.dataset.action = 'lfea-error-check-technical-toggle';
  technicalToggle.setAttribute('aria-expanded', 'false');
  technicalToggle.addEventListener('click', () => {
    technical.hidden = !technical.hidden;
    technicalToggle.setAttribute('aria-expanded', String(!technical.hidden));
  });
  details.append(technicalToggle);
  technical.append(
    labelledParagraph(doc, 'Finding code', group.code, 'lfea-common-error-check-code'),
    labelledParagraph(doc, 'Governed disposition', group.disposition, 'lfea-common-error-check-governed-disposition'),
    labelledParagraph(doc, 'Authority message', group.rows[0].message, 'lfea-common-error-check-authority-message'),
  );
  if (group.rows[0].technicalBasis) {
    technical.append(labelledParagraph(doc, 'Technical basis', group.rows[0].technicalBasis, 'lfea-common-error-check-technical-basis'));
  }
  if (group.rows[0].remediation) {
    technical.append(labelledParagraph(doc, 'Remediation', group.rows[0].remediation, 'lfea-common-error-check-remediation'));
  }
  technical.append(labelledParagraph(doc, 'Finding IDs',
    summarizeList(group.findingIds), 'lfea-common-error-check-finding-id'));
  details.append(technical);
  card.append(details);
  const action = renderGroupAction(controller, group);
  if (action) card.append(action);
  return card;
}

export function renderGroupAction(controller, group) {
  const doc = controller.documentRef;
  if (group.disposition === 'CONDITIONAL') return null;

  const row = doc.createElement('div');
  row.className = 'lfea-common-error-check__group-action';
  row.dataset.role = 'lfea-common-error-check-group-action';

  if (group.disposition === 'BLOCK') {
    if (LFEA_COMPONENT_FACTOR_AUTHORITY_CODES.has(group.code)) {
      if (!controller.inlineComponentBasisControlRendered) {
        controller.inlineComponentBasisControlRendered = true;
        row.append(inlineComponentBasisControl(controller), paragraph(doc,
          'Choose the code edition and bend rule here. The pre-flight re-runs on its own and this block clears -- nothing needs reloading.'));
      } else {
        row.append(paragraph(doc,
          'Resolve it in the "B31 / B31J component basis" selector above. The pre-flight re-runs on its own -- nothing needs reloading.'));
      }
      return row;
    }
    if (typeof controller.options.onLocateOccurrence === 'function'
      && controller.preFlight?.diagnostics?.sourceBundle?.sourceKind === 'ACCDB') {
      const locate = actionButton(doc, 'Locate first occurrence in piping model', 'icon-step-input');
      locate.dataset.action = 'lfea-error-check-locate-first';
      locate.addEventListener('click', () => controller.options.onLocateOccurrence(group.rows[0]));
      row.append(locate, paragraph(doc, 'Only supported source-table corrections are editable. Unsupported mechanics and governed choices are not fixes.'));
      return row;
    }
    const lock = actionButton(doc, 'Fix in source and reload', 'icon-step-input');
    lock.disabled = true;
    lock.dataset.action = 'lfea-error-check-fix-in-source';
    row.append(lock, paragraph(doc, 'BLOCK findings cannot be authorized.'));
    return row;
  }

  const reviewed = controller.reviewedGroupIds.has(group.groupId);
  const button = actionButton(doc, reviewed ? 'Reviewed' : 'Mark reviewed', 'icon-status-complete');
  button.dataset.action = 'lfea-error-check-mark-reviewed';
  button.dataset.groupId = group.groupId;
  button.dataset.reviewed = reviewed ? 'true' : 'false';
  button.addEventListener('click', () => controller.toggleInformationalReview(group.groupId));
  row.append(button, paragraph(doc, 'Informational only; no authorization is required.'));
  return row;
}

export function inlineComponentBasisControl(controller) {
  if (!controller.inlineComponentBasisControl) {
    controller.inlineComponentBasisControl = mountLfeaInlineBendFactorAuthorityControl(controller.documentRef);
  }
  return controller.inlineComponentBasisControl.root;
}

export function paragraph(doc, text) {
  const p = doc.createElement('p');
  p.textContent = text;
  return p;
}

export function labelledParagraph(doc, label, value, role) {
  const p = doc.createElement('p');
  p.dataset.role = role;
  const strong = doc.createElement('strong');
  strong.textContent = `${label}: `;
  p.append(strong, doc.createTextNode(value));
  return p;
}

export function actionButton(doc, text, iconId) {
  const button = doc.createElement('button');
  button.type = 'button';
  button.className = 'lfea-common-error-check__button';
  if (iconId) button.append(lfeaPipelineIcon(doc, iconId));
  const span = doc.createElement('span');
  span.textContent = text;
  button.append(span);
  return button;
}

export function summarizeList(values, limit = 12) {
  if (values.length <= limit) return values.join(', ');
  return `${values.slice(0, limit).join(', ')} ... (${values.length - limit} more)`;
}
