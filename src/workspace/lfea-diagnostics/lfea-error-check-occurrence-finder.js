import { actionButton } from './lfea-error-check-detailed-views.js';

export function renderOccurrenceFinder(controller, group) {
  const doc = controller.documentRef;
  const root = doc.createElement('div');
  root.className = 'lfea-common-error-check__occurrence-finder';
  root.dataset.role = 'lfea-error-check-occurrence-finder';
  const title = doc.createElement('strong');
  title.textContent = `Find individual occurrences (${group.rows.length})`;
  const search = doc.createElement('input');
  search.type = 'search';
  search.setAttribute('aria-label', `Search occurrences for ${group.code}`);
  search.placeholder = 'Finding ID, source feature, node, segment, case';
  search.dataset.role = 'lfea-error-check-occurrence-search';
  const results = doc.createElement('div');
  results.dataset.role = 'lfea-error-check-occurrence-results';
  const controls = doc.createElement('div');
  controls.className = 'lfea-common-error-check__occurrence-pager';
  let page = 0;
  const PAGE_SIZE = 8;
  const update = () => {
    const needle = search.value.toLowerCase().trim();
    const matching = group.rows.filter((entry) => {
      if (!needle) return true;
      const haystack = [
        entry.findingId, entry.code, entry.message,
        ...(entry.sourceFeatureIds ?? []), ...(entry.canonicalEntityIds ?? []),
        ...(entry.physicalCaseIds ?? []),
      ].join(' ').toLowerCase();
      return haystack.includes(needle);
    });
    const pages = Math.max(1, Math.ceil(matching.length / PAGE_SIZE));
    page = Math.min(page, pages - 1);
    results.replaceChildren();
    const slice = matching.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    for (const entry of slice) {
      const row = doc.createElement('div');
      row.className = 'lfea-common-error-check__occurrence';
      row.dataset.role = 'lfea-error-check-occurrence';
      row.dataset.findingId = entry.findingId;
      const label = doc.createElement('span');
      label.textContent = `${entry.findingId} · source `
        + (entry.sourceFeatureIds.length ? entry.sourceFeatureIds.join(', ') : 'no source-feature ID')
        + ` · entities ${entry.canonicalEntityIds.length ? entry.canonicalEntityIds.join(', ') : 'none'}`;
      row.append(label);
      const locate = actionButton(doc, 'Locate', 'icon-step-input');
      locate.dataset.action = 'lfea-error-check-locate-occurrence';
      locate.dataset.findingId = entry.findingId;
      locate.disabled = typeof controller.options.onLocateOccurrence !== 'function';
      locate.addEventListener('click', () => controller.options.onLocateOccurrence?.(entry, { edit: false }));
      row.append(locate);
      const edit = actionButton(doc, 'Inspect / edit source', 'icon-step-input');
      edit.dataset.action = 'lfea-error-check-edit-occurrence';
      edit.dataset.findingId = entry.findingId;
      edit.disabled = typeof controller.options.onLocateOccurrence !== 'function';
      edit.addEventListener('click', () => controller.options.onLocateOccurrence?.(entry, { edit: true }));
      row.append(edit);
      results.append(row);
    }
    if (!matching.length) {
      const empty = doc.createElement('p');
      empty.textContent = 'No matching occurrences; governed findings have not been dismissed.';
      results.append(empty);
    }
    controls.replaceChildren();
    const prev = actionButton(doc, 'Previous', 'icon-step-input');
    prev.dataset.action = 'lfea-error-check-occurrence-previous';
    prev.disabled = page === 0;
    prev.addEventListener('click', () => { page -= 1; update(); });
    const count = doc.createElement('span');
    count.textContent = `${page + 1} / ${pages} · ${matching.length} total`;
    const next = actionButton(doc, 'Next', 'icon-step-input');
    next.dataset.action = 'lfea-error-check-occurrence-next';
    next.disabled = page + 1 >= pages;
    next.addEventListener('click', () => { page += 1; update(); });
    controls.append(prev, count, next);
  };
  search.addEventListener('input', () => { page = 0; update(); });
  root.append(title, search, results, controls);
  update();
  return root;
}
