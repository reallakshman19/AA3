/** Shared element helpers for the Discretization surface panels. */

export function region(doc, title, role) {
  const section = node(doc, 'section', 'lafea-discretization__section');
  section.dataset.discretizationSection = role;
  section.append(node(doc, 'h3', null, title));
  return section;
}

export function button(doc, text, handler) {
  const value = node(doc, 'button', null, text);
  value.type = 'button';
  value.addEventListener('click', handler);
  return value;
}

export function node(doc, tag, className = null, text = undefined) {
  const value = doc.createElement(tag);
  if (className) value.className = className;
  if (text !== undefined) value.textContent = text;
  return value;
}
