import { card, element } from './lafea-workbench-dom.js';
import { lafeaCorrelationProductAvailability } from './lafea-correlation-product.js';

export function renderLafeaCorrelationAvailability(root, stage) {
  const availability = lafeaCorrelationProductAvailability(stage);
  const panel = card(root, 'Local attachment correlation');
  panel.section.dataset.role = 'lafea-correlation-availability';
  panel.section.dataset.guidedTarget = 'local-attachment-correlation';
  panel.section.dataset.correlationState = availability.state;

  const status = element(root, 'strong', 'lafea-result-highlights__status', availability.state);
  status.dataset.role = 'lafea-correlation-status';
  panel.body.append(
    status,
    element(root, 'p', 'lafea-workbench__section-intro',
      'Detailed local-attachment correlation is a separate governed extension of LAFEA.2. It may consume only retained LAFEA.2 resultants/pressure evidence and a source-bound attachment geometry after an engineering method is qualified.'),
  );

  const summary = element(root, 'table', 'lafea-result-table');
  summary.append(tableRow(root, 'Registered engineering methods',
    String(availability.registeredMethodCount)));
  summary.append(tableRow(root, 'LAFEA.2 execution',
    availability.sourceEvidence.screeningResultStatus));
  summary.append(tableRow(root, 'LAFEA.2 result qualification',
    availability.sourceEvidence.screeningResultQualification ?? 'NOT AVAILABLE'));
  summary.append(tableRow(root, 'Retained LAFEA.2 result hash',
    availability.sourceEvidence.screeningResultPayloadSemanticHash ?? 'NOT AVAILABLE'));
  panel.body.append(summary);

  if (availability.reasons.length) {
    const heading = element(root, 'h4', null, 'Engineering blockers');
    const list = element(root, 'ul', 'lafea-result-limitations');
    availability.reasons.forEach((reason) => {
      const item = element(root, 'li', null, reasonLabel(reason));
      item.dataset.correlationBlocker = reason;
      list.append(item);
    });
    panel.body.append(heading, list);
  }

  if (availability.methods.length) {
    const heading = element(root, 'h4', null, 'Qualified engineering methods');
    const table = element(root, 'table', 'lafea-result-table');
    const head = element(root, 'tr');
    ['Method', 'Edition', 'Dataset hash', 'Qualification record', 'Approval authority']
      .forEach((label) => {
        const cell = element(root, 'th', null, label);
        cell.scope = 'col';
        head.append(cell);
      });
    table.append(head);
    availability.methods.forEach((method) => {
      const row = element(root, 'tr');
      const methodCell = element(root, 'th', null, method.methodIdentity);
      methodCell.scope = 'row';
      row.append(
        methodCell,
        element(root, 'td', null, method.methodEdition),
        element(root, 'td', null, method.coefficientDatasetHash),
        element(root, 'td', null, method.qualificationRecordHash),
        element(root, 'td', null, method.approvalAuthorityId),
      );
      table.append(row);
    });
    panel.body.append(heading, table);
  } else {
    panel.body.append(element(
      root,
      'p',
      'lafea-workbench__authority',
      'No local-attachment empirical stress result is authorized. The synthetic coefficient fixture is software-qualification evidence only and is not exposed as an engineering method.',
    ));
  }

  if (availability.nextRequiredInput) {
    panel.body.append(element(root, 'p', 'lafea-workbench__authority',
      `Next governed input: ${availability.nextRequiredInput}.`));
  }
  return panel.section;
}

function tableRow(root, label, value) {
  const row = element(root, 'tr');
  const key = element(root, 'th', null, label);
  key.scope = 'row';
  row.append(key, element(root, 'td', null, value));
  return row;
}

function reasonLabel(reason) {
  const labels = {
    NO_ENGINEERING_CORRELATION_PROFILE_REGISTERED:
      'No qualified engineering correlation method/edition is registered.',
    QUALIFIED_LAFEA2_RESULT_REQUIRED:
      'Run and qualify the current LAFEA.2 nominal screening result before local-correlation custody can be established.',
    LAFEA2_RESULT_HASH_REQUIRED:
      'The qualified LAFEA.2 result is missing its retained payload semantic hash.',
  };
  return labels[reason] ?? reason;
}
