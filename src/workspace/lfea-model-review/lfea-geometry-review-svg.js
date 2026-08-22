import { createLfeaViewport, lfeaScreenPoint } from '../lfea-svg-viewport.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const WIDTH = 760;
const HEIGHT = 420;
const PADDING = 34;
const LEGEND_HEIGHT = 36;
const DIMENSIONS = Object.freeze({ width: WIDTH, height: HEIGHT, padding: PADDING, legendHeight: LEGEND_HEIGHT });

export function renderLfeaGeometryReviewSvg(host, descriptor) {
  if (!host || typeof host.replaceChildren !== 'function') {
    throw new TypeError('LFEA geometry review SVG requires a host element.');
  }
  host.replaceChildren();
  host.dataset.representation = descriptor?.representation ?? 'UNKNOWN';
  if (!descriptor?.available) {
    const empty = host.ownerDocument.createElement('p');
    empty.dataset.role = 'lfea-geometry-review-unavailable';
    empty.textContent = descriptor?.unavailableReason ?? 'Geometry representation is unavailable.';
    host.append(empty);
    return;
  }

  const projected = projectNodes(descriptor.nodes);
  const projectedById = new Map(projected.map((node) => [node.nodeId, node]));
  const transform = createLfeaViewport(projected, DIMENSIONS);
  const svg = host.ownerDocument.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${descriptor.label} piping geometry`);
  svg.dataset.role = 'lfea-geometry-review-svg';
  svg.dataset.representation = descriptor.representation;
  svg.dataset.objectPath = descriptor.objectPath;

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
    const title = host.ownerDocument.createElementNS(SVG_NS, 'title');
    title.textContent = `${segment.segmentId}: ${segment.type} ${segment.startNodeId} → ${segment.endNodeId}`;
    line.append(title);
    svg.append(line);

    const label = host.ownerDocument.createElementNS(SVG_NS, 'text');
    label.setAttribute('x', String((x1 + x2) / 2 + 4));
    label.setAttribute('y', String((y1 + y2) / 2 - 4));
    label.setAttribute('class', 'lfea-geometry-review__segment-label');
    label.dataset.segmentId = segment.segmentId;
    label.textContent = segment.type;
    svg.append(label);
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
  }

  const caption = host.ownerDocument.createElementNS(SVG_NS, 'text');
  caption.setAttribute('x', '14');
  caption.setAttribute('y', '20');
  caption.setAttribute('class', 'lfea-geometry-review__caption');
  caption.dataset.role = 'lfea-geometry-review-caption';
  caption.textContent = `${descriptor.label} · ${descriptor.nodes.length} nodes · ${descriptor.segments.length} spans · read-only isometric display`;
  svg.append(caption);
  host.append(svg);
}

export function projectLfeaGeometryReviewNodes(nodes) {
  return Object.freeze(projectNodes(nodes).map((node) => Object.freeze({ ...node })));
}

function projectNodes(nodes) {
  const cos30 = Math.sqrt(3) / 2;
  return nodes.map((node) => ({
    nodeId: node.nodeId,
    sourceX: node.x,
    sourceY: node.y,
    sourceZ: node.z,
    x: (node.x - node.y) * cos30,
    y: node.z + (node.x + node.y) * 0.5,
  }));
}
