export function actionButton(doc, label, handler) {
  const button = doc.createElement('button');
  button.type = 'button';
  button.textContent = label;
  if (handler) button.addEventListener('click', handler);
  return button;
}

export function textInput(doc, labelText) {
  const label = doc.createElement('label');
  label.textContent = `${labelText} `;
  const input = doc.createElement('input');
  input.type = 'text';
  label.append(input);
  return { label, input };
}

export function cell(doc, value) {
  const td = doc.createElement('td');
  td.textContent = String(value ?? '');
  return td;
}

export function paragraph(doc, text, className = '') {
  const p = doc.createElement('p');
  p.textContent = text;
  if (className) p.className = className;
  return p;
}

export function shortHash(value) {
  const text = String(value ?? '');
  return text.length > 18 ? `${text.slice(0, 18)}…` : text;
}

export function displayValue(value, unit) {
  const rendered = value === null ? 'UNRESOLVED' : value;
  return `${rendered}${unit && unit !== 'NONE' ? ` ${unit}` : ''}`;
}

export function findPresentationRecord(packageValue, ref, semanticHash = null) {
  return packageValue.records.find((entry) => (
    entry.ref === ref && (!semanticHash || entry.semanticHash === semanticHash)
  )) ?? null;
}
