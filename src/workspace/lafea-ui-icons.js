/** Small local monochrome icon registry for LAFEA presentation only. */

const ICON_PATHS = Object.freeze({
  model: 'M4 5.5h16v13H4z M8 5.5v13 M4 10h4',
  mesh: 'M12 3.5 21 19H3L12 3.5z M7.5 19 12 11l4.5 8 M7.5 11h9',
  solve: 'M7.5 4.5v15l11-7.5-11-7.5z',
  results: 'M4 20V11 M10 20V7 M16 20V4 M22 20H2',
  evidence: 'M6 3.5h9l4 4V20.5H6z M15 3.5v4h4 M9 12h7 M9 16h5',
});

export function lafeaUiIcon(documentRef, iconId) {
  if (!documentRef?.createElementNS) throw new TypeError('LAFEA_UI_ICON_DOCUMENT_REQUIRED');
  const pathData = ICON_PATHS[iconId];
  if (!pathData) throw new TypeError(`LAFEA_UI_ICON_UNKNOWN:${iconId}`);
  const svg = documentRef.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('lafea-ui-icon');
  svg.dataset.iconId = iconId;
  const path = documentRef.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', pathData);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.7');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.append(path);
  return svg;
}

export function lafeaWorkflowAreaIconId(areaId) {
  if (areaId === 'MODEL') return 'model';
  if (areaId === 'MESH') return 'mesh';
  if (areaId === 'SOLVE') return 'solve';
  if (areaId === 'RESULTS') return 'results';
  return 'evidence';
}
