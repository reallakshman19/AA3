/** Accessible compact disclosure for non-actionable LAFEA metadata/evidence. */

export function createLafeaInfoDisclosure(doc, title, rows, options = {}) {
  if (!doc?.createElement) throw new TypeError('LAFEA_INFO_DISCLOSURE_DOCUMENT_REQUIRED');
  const details = doc.createElement('details');
  details.className = options.className ?? 'lafea-info-disclosure';
  details.dataset.role = options.role ?? 'lafea-info-disclosure';

  const summary = doc.createElement('summary');
  summary.textContent = options.summaryText ?? '(i)';
  summary.title = title;
  summary.setAttribute('aria-label', title);
  details.append(summary);

  if (options.heading !== false) {
    const heading = doc.createElement('strong');
    heading.textContent = title;
    details.append(heading);
  }

  const cleanRows = Array.isArray(rows)
    ? rows.filter((row) => Array.isArray(row) && row.length >= 2)
    : [];
  if (cleanRows.length) {
    const list = doc.createElement('dl');
    list.className = options.listClassName ?? 'lafea-info-disclosure__list';
    for (const [label, value] of cleanRows) {
      const dt = doc.createElement('dt');
      dt.textContent = String(label);
      const dd = doc.createElement('dd');
      dd.textContent = value == null || value === '' ? 'Not declared' : String(value);
      list.append(dt, dd);
    }
    details.append(list);
  }
  return details;
}

export function rowsFromLafeaItems(items) {
  return Array.isArray(items)
    ? items.map((item) => [item?.label ?? '', item?.value ?? 'Not declared'])
    : [];
}
