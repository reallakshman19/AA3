import { createLfeaViewport, lfeaScreenPoint } from '../lfea-svg-viewport.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const WIDTH = 760;
const HEIGHT = 420;
const PADDING = 34;
const LEGEND_HEIGHT = 36;
export const LFEA_GEOMETRY_SEGMENT_LABEL_LIMIT = 40;
const DIMENSIONS = Object.freeze({ width: WIDTH, height: HEIGHT, padding: PADDING, legendHeight: LEGEND_HEIGHT });

/**
 * Pan/zoom state for the geometry SVG is expressed as a viewBox rectangle in
 * the same fixed WIDTH x HEIGHT user-space the geometry is projected into.
 * Callers (the model review panel) persist the last viewBox across
 * re-renders so switching representation or vertical axis does not reset a
 * reviewer's zoomed-in position.
 */
export const LFEA_GEOMETRY_DEFAULT_VIEW_BOX = Object.freeze({ x: 0, y: 0, width: WIDTH, height: HEIGHT });
const MIN_VIEW_WIDTH = WIDTH * 0.08;
const WHEEL_ZOOM_FACTOR = 1.15;
export const LFEA_GEOMETRY_BUTTON_ZOOM_FACTOR = 1.4;

export function zoomLfeaGeometryViewBox(viewBox, factor, focal) {
  const box = viewBox ?? LFEA_GEOMETRY_DEFAULT_VIEW_BOX;
  const focalPoint = focal ?? { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const width = clamp(box.width * factor, MIN_VIEW_WIDTH, LFEA_GEOMETRY_DEFAULT_VIEW_BOX.width);
  const scale = width / box.width;
  const height = box.height * scale;
  return Object.freeze({
    x: focalPoint.x - (focalPoint.x - box.x) * scale,
    y: focalPoint.y - (focalPoint.y - box.y) * scale,
    width,
    height,
  });
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * CAESAR's default global coordinate system is Y-vertical, unlike many other
 * piping tools that treat Z as up. The isometric projection below is driven
 * by a configurable vertical axis instead of a hardcoded one so this display
 * can match the source convention rather than silently reinterpreting it.
 */
export const LFEA_GEOMETRY_VERTICAL_AXES = Object.freeze(['Y', 'Z']);
const DEFAULT_VERTICAL_AXIS = 'Y';

const BEND_SEGMENT_TYPES = Object.freeze(new Set(['BEND', 'ELBOW']));
/**
 * Restraint glyphs hang below the pipe/node point on a short stub, matching
 * the piping-isometric convention of drawing a support below the line it
 * restrains rather than on top of it, where it would collide with the
 * centerline, the node marker, and segment labels.
 *
 * A real model routinely declares 2-3 restraint rows at one node (e.g. a
 * vertical rest plus a guide plus a limit stop, which together behave like
 * an anchor). Kept at the size that reads well for a single isolated
 * restraint, that many arrows fanned a few pixels apart cross into a tangle.
 * These sizes are deliberately small — closer to a compact support icon than
 * a full vector arrow — so a multi-restraint node still reads as one cluster
 * rather than a starburst.
 */
const RESTRAINT_ARROW_LENGTH = 8;
const RESTRAINT_HEAD_LENGTH = 3;
const RESTRAINT_HEAD_SPREAD = 0.35;
/** Clears the node marker (r = 3.5) so the head touches the pipe without hiding under it. */
const RESTRAINT_NODE_CLEARANCE = 4;
/** Half-span of the two-headed (double-acting) arrow, measured from the node. */
const RESTRAINT_DOUBLE_ACTING_HALF_SPAN = 9;
/** Only the directionless anchor hatch hangs off a stub; directional arrows touch the node. */
const RESTRAINT_STANDOFF = 9;
const RESTRAINT_HIT_RADIUS = 7;

export function lfeaGeometryReviewDisplayDensity(segmentCount) {
  if (!Number.isInteger(segmentCount) || segmentCount < 0) {
    throw new TypeError('LFEA geometry display density requires a non-negative integer segment count.');
  }
  return Object.freeze({
    segmentLabelsVisible: segmentCount <= LFEA_GEOMETRY_SEGMENT_LABEL_LIMIT,
    segmentLabelLimit: LFEA_GEOMETRY_SEGMENT_LABEL_LIMIT,
  });
}

export function renderLfeaGeometryReviewSvg(host, descriptor, options = {}) {
  if (!host || typeof host.replaceChildren !== 'function') {
    throw new TypeError('LFEA geometry review SVG requires a host element.');
  }
  const verticalAxis = requireVerticalAxis(options.verticalAxis);
  host.replaceChildren();
  host.dataset.representation = descriptor?.representation ?? 'UNKNOWN';
  host.dataset.verticalAxis = verticalAxis;
  if (!descriptor?.available) {
    const empty = host.ownerDocument.createElement('p');
    empty.dataset.role = 'lfea-geometry-review-unavailable';
    empty.textContent = descriptor?.unavailableReason ?? 'Geometry representation is unavailable.';
    host.append(empty);
    return;
  }

  const density = lfeaGeometryReviewDisplayDensity(descriptor.segments.length);
  host.dataset.segmentLabels = density.segmentLabelsVisible ? 'VISIBLE' : 'SUPPRESSED_FOR_DENSITY';
  const axes = isometricAxes(verticalAxis);
  const projected = projectNodes(descriptor.nodes, verticalAxis);
  const projectedById = new Map(projected.map((node) => [node.nodeId, node]));
  const transform = createLfeaViewport(projected, DIMENSIONS);
  const svg = host.ownerDocument.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${descriptor.label} piping geometry`);
  svg.dataset.role = 'lfea-geometry-review-svg';
  svg.dataset.representation = descriptor.representation;
  svg.dataset.objectPath = descriptor.objectPath;
  svg.dataset.verticalAxis = verticalAxis;

  for (const segment of descriptor.segments) {
    const start = projectedById.get(segment.startNodeId);
    const end = projectedById.get(segment.endNodeId);
    if (!start || !end) continue;
    const [x1, y1] = lfeaScreenPoint(start, transform);
    const [x2, y2] = lfeaScreenPoint(end, transform);
    const line = host.ownerDocument.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', String(x1));
    line.setAttribute('y1', String(y1));
    line.setAttribute('x2', String(x2));
    line.setAttribute('y2', String(y2));
    line.setAttribute('class', 'lfea-geometry-review__segment');
    line.dataset.segmentId = segment.segmentId;
    line.dataset.segmentType = segment.type;
    line.dataset.segmentCategory = lfeaSegmentCategory(segment.type);
    const title = host.ownerDocument.createElementNS(SVG_NS, 'title');
    title.textContent = `${segment.segmentId}: ${segment.type} ${segment.startNodeId} → ${segment.endNodeId}`;
    line.append(title);
    svg.append(line);

    if (density.segmentLabelsVisible) {
      const label = host.ownerDocument.createElementNS(SVG_NS, 'text');
      label.setAttribute('x', String((x1 + x2) / 2 + 4));
      label.setAttribute('y', String((y1 + y2) / 2 - 4));
      label.setAttribute('class', 'lfea-geometry-review__segment-label');
      label.dataset.segmentId = segment.segmentId;
      label.textContent = segment.type;
      svg.append(label);
    }
  }

  for (const node of projected) {
    const [x, y] = lfeaScreenPoint(node, transform);
    const marker = host.ownerDocument.createElementNS(SVG_NS, 'circle');
    marker.setAttribute('cx', String(x));
    marker.setAttribute('cy', String(y));
    marker.setAttribute('r', '3.5');
    marker.setAttribute('class', 'lfea-geometry-review__node');
    marker.dataset.nodeId = node.nodeId;
    svg.append(marker);

    for (const restraint of node.restraints) {
      appendRestraintGlyph(host.ownerDocument, svg, x, y, restraint, node.nodeId, axes);
    }
  }

  appendLegend(host.ownerDocument, svg);

  const caption = host.ownerDocument.createElementNS(SVG_NS, 'text');
  caption.setAttribute('x', '14');
  caption.setAttribute('y', '20');
  caption.setAttribute('class', 'lfea-geometry-review__caption');
  caption.dataset.role = 'lfea-geometry-review-caption';
  const densityNote = density.segmentLabelsVisible
    ? ''
    : ` · inline span labels hidden above ${density.segmentLabelLimit} spans (hover for type); all spans/nodes retained`;
  caption.textContent = `${descriptor.label} · ${descriptor.nodes.length} nodes · ${descriptor.segments.length} spans · read-only isometric display · vertical axis ${verticalAxis}${densityNote}`;
  svg.append(caption);
  host.append(svg);
  attachLfeaGeometryViewportInteractions(svg, options.viewBox ?? LFEA_GEOMETRY_DEFAULT_VIEW_BOX, options.onViewBoxChange);
}

/**
 * Mouse-wheel zoom and drag-to-pan over the fixed WIDTH x HEIGHT user space.
 * This only changes what part of the already-computed geometry is visible;
 * it never recomputes node positions or mutates the descriptor.
 */
function attachLfeaGeometryViewportInteractions(svg, initialViewBox, onViewBoxChange) {
  let viewBox = { ...initialViewBox };
  applyViewBox(svg, viewBox);
  svg.style.touchAction = 'none';
  svg.style.cursor = 'grab';
  let drag = null;

  svg.addEventListener('wheel', (event) => {
    event.preventDefault();
    const rect = svg.getBoundingClientRect();
    const focal = {
      x: viewBox.x + ((event.clientX - rect.left) / Math.max(rect.width, 1)) * viewBox.width,
      y: viewBox.y + ((event.clientY - rect.top) / Math.max(rect.height, 1)) * viewBox.height,
    };
    const factor = event.deltaY > 0 ? WHEEL_ZOOM_FACTOR : 1 / WHEEL_ZOOM_FACTOR;
    viewBox = zoomLfeaGeometryViewBox(viewBox, factor, focal);
    applyViewBox(svg, viewBox);
    onViewBoxChange?.(viewBox);
  }, { passive: false });

  svg.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    drag = { startX: event.clientX, startY: event.clientY, origin: { ...viewBox } };
    svg.setPointerCapture(event.pointerId);
    svg.style.cursor = 'grabbing';
  });
  svg.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const rect = svg.getBoundingClientRect();
    const dx = (event.clientX - drag.startX) * (drag.origin.width / Math.max(rect.width, 1));
    const dy = (event.clientY - drag.startY) * (drag.origin.height / Math.max(rect.height, 1));
    viewBox = { ...drag.origin, x: drag.origin.x - dx, y: drag.origin.y - dy };
    applyViewBox(svg, viewBox);
  });
  const endDrag = () => {
    if (!drag) return;
    drag = null;
    svg.style.cursor = 'grab';
    onViewBoxChange?.(viewBox);
  };
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);
}

function applyViewBox(svg, box) {
  svg.setAttribute('viewBox', `${box.x} ${box.y} ${box.width} ${box.height}`);
}

export function projectLfeaGeometryReviewNodes(nodes, verticalAxis = DEFAULT_VERTICAL_AXIS) {
  return Object.freeze(projectNodes(nodes, verticalAxis).map((node) => Object.freeze({ ...node })));
}

function projectNodes(nodes, verticalAxis) {
  const axes = isometricAxes(verticalAxis);
  return nodes.map((node) => {
    const { x, y } = isometricComponents(node, axes);
    return {
      nodeId: node.nodeId,
      sourceX: node.x,
      sourceY: node.y,
      sourceZ: node.z,
      restraints: node.restraints ?? [],
      x,
      y,
    };
  });
}

function isometricAxes(verticalAxis) {
  return verticalAxis === 'Z'
    ? { h1: 'x', h2: 'y', vert: 'z' }
    : { h1: 'x', h2: 'z', vert: 'y' };
}

function isometricComponents(point, axes) {
  const cos30 = Math.sqrt(3) / 2;
  const h1 = point[axes.h1] ?? 0;
  const h2 = point[axes.h2] ?? 0;
  const vert = point[axes.vert] ?? 0;
  return { x: (h1 - h2) * cos30, y: vert + (h1 + h2) * 0.5 };
}

function requireVerticalAxis(value) {
  const axis = String(value ?? DEFAULT_VERTICAL_AXIS).toUpperCase();
  if (!LFEA_GEOMETRY_VERTICAL_AXES.includes(axis)) {
    throw new TypeError(`Unknown LFEA geometry vertical axis ${String(value)}. Expected one of ${LFEA_GEOMETRY_VERTICAL_AXES.join(', ')}.`);
  }
  return axis;
}

function lfeaSegmentCategory(type) {
  const value = String(type ?? '').toUpperCase();
  if (value === 'PIPE') return 'PIPE';
  if (BEND_SEGMENT_TYPES.has(value)) return 'BEND';
  return 'FITTING';
}

/**
 * A restraint is drawn from its declared direction cosines rather than as a
 * fixed symbol: the cosine vector is projected through the same isometric
 * axes as the geometry, then normalized to a fixed screen length so every
 * restraint points the way its source record actually declares.
 *
 * The glyph is anchored ON the node and rotated by that direction; it is
 * never translated away from the pipe. The arrow head sits just outside the
 * node marker and points along the restraint direction (into the pipe, the
 * way the support acts on it), with the tail extending outward on the
 * opposite side. A vertical +Y support therefore hangs below the pipe with
 * its head pointing up into it -- the piping-isometric convention -- while a
 * horizontal guide lies to the side, and in every case the symbol touches
 * the centerline instead of floating clear of it. Offsetting the symbol to
 * encode direction is what opens a gap between support and pipe, and it is
 * why a multi-restraint node used to read as a detached starburst; distinct
 * restraints already have distinct directions, so they radiate apart on
 * their own without any positional fan-out.
 *
 * A restraint with no resolvable direction (an anchor, fixed in every degree
 * of freedom) falls back to a ground-hatch mark on a short stub below the
 * node, rather than implying a direction that is not in the source data.
 *
 * The whole glyph -- arrow or stub+hatch, plus an enlarged invisible hit
 * area -- is grouped under one <title> so hovering anywhere near the symbol
 * (not just its thin strokes) discloses the restraint's type, node and
 * cosines.
 */
function appendRestraintGlyph(doc, svg, nodeX, nodeY, restraint, nodeId, axes) {
  const cosine = {
    x: restraint.xCosine ?? 0,
    y: restraint.yCosine ?? 0,
    z: restraint.zCosine ?? 0,
  };
  const direction = restraintScreenDirection(cosine, axes);
  const group = doc.createElementNS(SVG_NS, 'g');
  group.setAttribute('class', 'lfea-geometry-review__restraint-glyph');
  const title = doc.createElementNS(SVG_NS, 'title');
  title.textContent = restraintInfoText(restraint, nodeId, direction);
  group.append(title);

  let hitX = nodeX;
  let hitY = nodeY + RESTRAINT_STANDOFF;
  if (direction) {
    const doubleActing = restraint.actionSense === 'DOUBLE_ACTING';
    group.dataset.actionSense = restraint.actionSense ?? 'UNKNOWN';
    const anchor = appendRestraintArrow(doc, group, nodeX, nodeY, direction, doubleActing);
    hitX = anchor.x;
    hitY = anchor.y;
  } else {
    appendLine(doc, group, nodeX, nodeY, hitX, hitY, null, 'lfea-geometry-review__restraint-stub');
    appendRestraintHatch(doc, group, hitX, hitY);
  }

  const hitArea = doc.createElementNS(SVG_NS, 'circle');
  hitArea.setAttribute('cx', String(hitX));
  hitArea.setAttribute('cy', String(hitY));
  hitArea.setAttribute('r', String(RESTRAINT_HIT_RADIUS));
  hitArea.setAttribute('class', 'lfea-geometry-review__restraint-hit');
  group.append(hitArea);

  svg.append(group);
}

function restraintInfoText(restraint, nodeId, direction) {
  const label = restraint.typeLabel ?? 'RESTRAINT';
  if (!direction) return `${label} restraint @ node ${nodeId} — fixed in all directions (anchor)`;
  const cosineText = ['xCosine', 'yCosine', 'zCosine']
    .map((key) => (typeof restraint[key] === 'number' ? restraint[key].toFixed(2) : '0.00'))
    .join(', ');
  return `${label} restraint @ node ${nodeId} — ${restraintActionText(label, restraint.actionSense)} · direction cosines (${cosineText})`;
}

/**
 * States what the restraint actually stops, in CAESAR's own terms: a one-way
 * `+Y` acts upward and so resists downward (-Y) movement while leaving lift-off
 * free, whereas a bare `Y` resists both senses of the same axis.
 */
function restraintActionText(label, actionSense) {
  const axis = String(label ?? '').trim().toUpperCase().replace(/^[+-]/u, '');
  const named = /^R?[XYZ]$/u.test(axis);
  if (actionSense === 'POSITIVE_SINGLE_ACTING') {
    return named
      ? `one-way, acts +${axis}: resists pipe movement in -${axis} only`
      : 'one-way: resists pipe movement against the arrow only';
  }
  if (actionSense === 'NEGATIVE_SINGLE_ACTING') {
    return named
      ? `one-way, acts -${axis}: resists pipe movement in +${axis} only`
      : 'one-way: resists pipe movement against the arrow only';
  }
  if (actionSense === 'DOUBLE_ACTING') {
    return named
      ? `double-acting: resists pipe movement in both +${axis} and -${axis}`
      : 'double-acting: resists pipe movement in both senses of this axis';
  }
  return 'action sense not declared by the source record';
}

function restraintScreenDirection(cosine, axes) {
  const { x, y } = isometricComponents(cosine, axes);
  const length = Math.hypot(x, y);
  if (!(length > 1e-9)) return null;
  return { dx: x / length, dy: -y / length };
}

/**
 * Draws the restraint arrow anchored on the node and rotated by `direction`.
 *
 * A double-acting restraint resists both senses of its axis equally, so its
 * symbol is a two-headed arrow centred on the pipe centreline -- it straddles
 * the node symmetrically rather than hanging to one side, because there is no
 * preferred side to hang on. A one-way restraint keeps the asymmetric form:
 * head at the pipe pointing the way the support acts, shaft trailing off the
 * opposite side, which is what makes `+Y` visually distinct from `Y` even
 * though both share the same cosines.
 *
 * Returns the point the hover target should centre on.
 */
function appendRestraintArrow(doc, group, nodeX, nodeY, direction, doubleActing) {
  if (doubleActing) {
    // direction.dy is already in screen space (positive = down), so the arms
    // are applied directly without re-flipping.
    const armX = direction.dx * RESTRAINT_DOUBLE_ACTING_HALF_SPAN;
    const armY = direction.dy * RESTRAINT_DOUBLE_ACTING_HALF_SPAN;
    const positiveX = nodeX + armX;
    const positiveY = nodeY + armY;
    const negativeX = nodeX - armX;
    const negativeY = nodeY - armY;
    // Both heads point inward, converging on the pipe centre: the support
    // bears on the pipe from both sides, so the arrows show what pushes on
    // the pipe rather than pointing away into free space.
    appendLine(doc, group, negativeX, negativeY, positiveX, positiveY);
    appendRestraintHead(doc, group, positiveX, positiveY, Math.atan2(armY, armX));
    appendRestraintHead(doc, group, negativeX, negativeY, Math.atan2(-armY, -armX));
    // Offset the hover target onto one arm so several double-acting
    // restraints centred on the same node stay separately hoverable.
    return { x: nodeX + armX * 0.6, y: nodeY + armY * 0.6 };
  }
  const outX = -direction.dx;
  const outY = -direction.dy;
  const tipX = nodeX + outX * RESTRAINT_NODE_CLEARANCE;
  const tipY = nodeY + outY * RESTRAINT_NODE_CLEARANCE;
  const tailX = nodeX + outX * (RESTRAINT_NODE_CLEARANCE + RESTRAINT_ARROW_LENGTH);
  const tailY = nodeY + outY * (RESTRAINT_NODE_CLEARANCE + RESTRAINT_ARROW_LENGTH);
  appendLine(doc, group, tailX, tailY, tipX, tipY);
  appendRestraintHead(doc, group, tipX, tipY, Math.atan2(outY, outX));
  return { x: (tipX + tailX) / 2, y: (tipY + tailY) / 2 };
}

function appendRestraintHead(doc, group, x, y, backAngle) {
  for (const sign of [-1, 1]) {
    const headAngle = backAngle + sign * RESTRAINT_HEAD_SPREAD;
    appendLine(doc, group, x, y,
      x + Math.cos(headAngle) * RESTRAINT_HEAD_LENGTH,
      y + Math.sin(headAngle) * RESTRAINT_HEAD_LENGTH);
  }
}

function appendRestraintHatch(doc, group, x, y) {
  appendLine(doc, group, x - 5, y, x + 5, y);
  for (const offset of [-3.5, 0, 3.5]) {
    appendLine(doc, group, x + offset, y, x + offset - 2.5, y + 3);
  }
}

function appendLine(doc, svg, x1, y1, x2, y2, title, className = 'lfea-geometry-review__restraint') {
  const line = doc.createElementNS(SVG_NS, 'line');
  line.setAttribute('x1', String(x1));
  line.setAttribute('y1', String(y1));
  line.setAttribute('x2', String(x2));
  line.setAttribute('y2', String(y2));
  line.setAttribute('class', className);
  if (title) {
    const titleEl = doc.createElementNS(SVG_NS, 'title');
    titleEl.textContent = title;
    line.append(titleEl);
  }
  svg.append(line);
  return line;
}

const LEGEND_ENTRIES = Object.freeze([
  ['PIPE', 'Pipe'],
  ['BEND', 'Bend'],
  ['FITTING', 'Fitting'],
]);

function appendLegend(doc, svg) {
  const legend = doc.createElementNS(SVG_NS, 'g');
  legend.setAttribute('class', 'lfea-geometry-review__legend');
  legend.dataset.role = 'lfea-geometry-review-legend';
  const legendY = HEIGHT - LEGEND_HEIGHT / 2;
  let legendX = PADDING;
  for (const [category, label] of LEGEND_ENTRIES) {
    const swatch = appendLine(doc, legend, legendX, legendY, legendX + 18, legendY, null, 'lfea-geometry-review__segment');
    swatch.dataset.segmentCategory = category;
    legendX = appendLegendLabel(doc, legend, legendX, legendY, label);
  }
  for (const [doubleActing, label] of [[false, 'Restraint (one-way)'], [true, 'Restraint (double-acting)']]) {
    appendLine(doc, legend, legendX, legendY, legendX + 18, legendY);
    // Heads converge, matching the on-model glyph.
    appendRestraintHead(doc, legend, legendX, legendY, Math.PI);
    if (doubleActing) appendRestraintHead(doc, legend, legendX + 18, legendY, 0);
    legendX = appendLegendLabel(doc, legend, legendX, legendY, label);
  }
  svg.append(legend);
}

function appendLegendLabel(doc, legend, legendX, legendY, label) {
  const text = doc.createElementNS(SVG_NS, 'text');
  text.setAttribute('x', String(legendX + 24));
  text.setAttribute('y', String(legendY + 4));
  text.setAttribute('class', 'lfea-geometry-review__legend-label');
  text.textContent = label;
  legend.append(text);
  return legendX + 24 + label.length * 6 + 20;
}
