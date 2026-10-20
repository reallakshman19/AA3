

import { LFEA_PIPELINE_ACCDB_PROFILE_IDS, LFEA_PIPELINE_ACCDB_PROFILE_LABELS } from './lfea-pipeline-accdb-view-model.js';
import { button } from './lfea-accdb-panel-utils.js';
// The contiguous DOM assembly retains the established mount and role contract.
export function createAccdbInputPanelSection(doc) {
  const section = doc.createElement('section');
  section.className = 'properties-accordion-section linear-piping-results-workbench';
  section.dataset.sectionId = 'lfea-pipeline-accdb-input';
  section.dataset.role = 'lfea-pipeline-accdb-input-panel';

  const header = doc.createElement('header');
  header.className = 'accordion-section-header';
  const title = doc.createElement('span');
  title.className = 'accordion-section-title';
  title.textContent = 'ACCDB — CAESAR II database (linear geometry only)';
  header.append(title);

  const body = doc.createElement('div');
  body.className = 'accordion-section-body';
  const toolbar = doc.createElement('div');
  toolbar.className = 'linear-piping-results-workbench__toolbar';

  const importButton = button(doc, 'Import CAESAR II ACCDB');
  importButton.dataset.action = 'import-lfea-pipeline-accdb-source';
  const fileInput = doc.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.accdb,.mdb';
  fileInput.hidden = true;
  fileInput.dataset.role = 'lfea-pipeline-accdb-source-file';

  const clearButton = button(doc, 'Clear');
  clearButton.dataset.action = 'clear-lfea-pipeline-accdb-source';

  // Which profile the verdict below is read through. The default matches the
  // InputXML surface's own default (the disclosed approximation profile):
  // strict is the stricter claim, so it is chosen deliberately, not by
  // landing on it.
  const profileLabel = doc.createElement('label');
  profileLabel.textContent = 'Analysis profile ';
  const profileSelect = doc.createElement('select');
  profileSelect.dataset.role = 'lfea-pipeline-accdb-profile';
  for (const profileId of LFEA_PIPELINE_ACCDB_PROFILE_IDS) {
    const option = doc.createElement('option');
    option.value = profileId;
    option.textContent = LFEA_PIPELINE_ACCDB_PROFILE_LABELS[profileId] ?? profileId;
    profileSelect.append(option);
  }
  profileLabel.append(profileSelect);

  toolbar.append(importButton, fileInput, clearButton, profileLabel);

  const status = doc.createElement('output');
  status.className = 'linear-piping-results-workbench__status';
  status.dataset.role = 'lfea-pipeline-accdb-status';
  status.setAttribute('aria-live', 'polite');
  const error = doc.createElement('p');
  error.className = 'linear-piping-results-workbench__error';
  error.dataset.role = 'lfea-pipeline-accdb-error';
  error.hidden = true;
  const summaryRoot = doc.createElement('div');
  summaryRoot.dataset.role = 'lfea-pipeline-accdb-summary';

  body.append(toolbar, status, error, summaryRoot);
  section.append(header, body);
  return { section, importButton, fileInput, clearButton, profileSelect, status, error, summaryRoot };
}

/**
 * The panel renders two halves, because Input and Error check ask different
 * questions of the same import.
 *
 * Input is the file and what was read out of it -- counts, units, and the
 * per-element values an engineer may override. Error check is the review of
 * what those mean: the capabilities, the findings, and the acceptance that
 * lets the analysis proceed. The shell stamps the active step on the SOURCE
 * host and the stylesheet shows one half at a time.
 *
 * Both halves live under this one panel deliberately. Before this, Error
 * check hid the ACCDB panel outright -- a rule from when the panel only
 * imported and InputXML owned the review -- so the step the stepper sent an
 * engineer to was the one step that hid the findings and the accept button it
 * was telling them to use.
 */
