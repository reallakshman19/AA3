import { paragraph } from './empirical-v3-view-primitives.js';

export function renderEmpiricalV3EvidenceInspector(root, entry) {
  const doc = root.ownerDocument;
  if (!entry) {
    root.hidden = true;
    root.replaceChildren();
    return;
  }
  const heading = doc.createElement('strong');
  heading.textContent = `${entry.kind}: ${entry.ref}`;
  const identity = paragraph(doc, `Semantic hash: ${entry.semanticHash}`);
  const children = [heading, identity];
  if (entry.evidenceHash) children.push(paragraph(doc, `Evidence hash: ${entry.evidenceHash}`));
  const pre = doc.createElement('pre');
  pre.textContent = JSON.stringify(entry.record, null, 2);
  children.push(pre);
  root.hidden = false;
  root.replaceChildren(...children);
}
