import { actionButton, paragraph, textInput } from './empirical-v3-view-primitives.js';

export function renderEmpiricalV3ResultReview(root, state = {}, actions = {}) {
  const doc = root.ownerDocument;
  const section = doc.createElement('section');
  section.className = 'empirical-v3-explain__section';
  const title = doc.createElement('h4');
  title.textContent = 'Result review';
  section.append(title);
  if (!state.evidence) {
    section.append(paragraph(doc, 'No sealed result evidence is available for review.'));
    root.replaceChildren(section);
    return;
  }
  if (state.resultReview) {
    section.append(
      paragraph(doc, `Current review: ${state.resultReview.receiptId}`),
      paragraph(doc, `Reviewer: ${state.resultReview.auditMetadata.actor ?? 'not recorded'}`),
      paragraph(doc, `Disposition: ${state.resultReview.disposition}`),
    );
    if (state.auditReady) {
      section.append(paragraph(doc, `Audit readiness sealed: ${state.auditReady.readinessId}`));
    } else {
      const button = actionButton(doc, 'Prepare audit', () => actions.prepareAudit?.());
      button.disabled = !actions.prepareAudit;
      section.append(
        paragraph(doc, 'Result review is current. Audit readiness is a separate governed transition.'),
        button,
      );
    }
    root.replaceChildren(section);
    return;
  }
  const actor = textInput(doc, 'Reviewer');
  const comment = textInput(doc, 'Review conclusion / comment');
  const button = actionButton(doc, 'Record result review', () => actions.review?.({
    actor: actor.input.value,
    comment: comment.input.value,
  }));
  button.disabled = !actions.review;
  section.append(
    paragraph(doc, `Evidence: ${state.evidence.evidenceId}`),
    paragraph(doc, 'This records review of the sealed coupled result; it does not change reactions, displacements, risks, or formulas.'),
    actor.label,
    comment.label,
    button,
  );
  root.replaceChildren(section);
}
