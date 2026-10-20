/**
 * LFEA Error Check Action Workbench: Controller Actions & Transaction Orchestration
 *
 * Implements 5–7 click reference path actions: prepare, preset, preview, apply,
 * undo, run prototype, and exact fixable element target identification.
 */

import { classifyFindingLane } from './lfea-error-check-workbench-view.js';
export { applyPreset } from './lfea-error-check-preset.js';

export function getFixableElementIds(controller) {
  const accdbController = controller.options.getAccdbController?.();
  const rows = accdbController?.tables?.INPUT_BASIC_ELEMENT_DATA?.rows ?? [];
  const presentation = controller.presentation;
  if (!presentation || !presentation.sections) return [];

  // Find all findings in the FIX_INPUTS lane
  const fixInputsGroups = presentation.sections
    .flatMap((s) => s.groups)
    .filter((g) => classifyFindingLane(g) === 'FIX_INPUTS');

  if (fixInputsGroups.length === 0) {
    // Check if any element rows actually have missing/invalid properties
    const missingPropertyRows = rows.filter((r) =>
      r.DIAMETER == null || Number(r.DIAMETER) <= 0 || r.WALL_THICK == null || Number(r.WALL_THICK) <= 0,
    );
    return missingPropertyRows.map((r) => String(r.ELEMENTID));
  }

  const affectedIds = new Set();
  const records = accdbController?.sourceBundle?.elementRecords ?? [];

  for (const group of fixInputsGroups) {
    for (const row of group.rows ?? []) {
      const features = new Set(row.sourceFeatureIds ?? []);
      const entities = new Set(row.canonicalEntityIds ?? []);

      for (const record of records) {
        const idStr = String(record.accdbElementId);
        if (
          features.has(record.sourceFeatureId) ||
          features.has(record.canonicalSegmentId) ||
          features.has(`ACCDB-SOURCE-E${idStr}`) ||
          features.has(idStr) ||
          entities.has(idStr) ||
          entities.has(record.canonicalSegmentId)
        ) {
          affectedIds.add(idStr);
        }
      }

      for (const feat of features) {
        const m = /^ACCDB-SOURCE-E(\d+)$/u.exec(feat);
        if (m) affectedIds.add(m[1]);
        else if (/^\d+$/u.test(feat)) affectedIds.add(feat);
      }
    }
  }

  return [...affectedIds].sort((a, b) => Number(a) - Number(b));
}

export function preparePrototype(controller) {
  const accdbController = controller.options.getAccdbController?.();
  if (accdbController && typeof accdbController.prepare === 'function') {
    const tables = accdbController.effectiveTables ?? accdbController.tables;
    if (tables) accdbController.prepare(tables);
  }
  controller.refresh();
}

export function stageBatchPreview(controller, patches) {
  controller.stagedBatch = {
    propertyPatches: patches,
    componentBasis: controller.stagedPreset?.componentBasis,
    requestedProfileId: controller.stagedPreset?.requestedProfileId,
    requestedCaseIds: controller.stagedPreset?.requestedCaseIds,
  };
  controller.bulkEditorOpen = false;
  controller.previewBatch();
}

export function previewBatch(controller) {
  const accdbController = controller.options.getAccdbController?.();
  if (!accdbController) {
    controller.batchError = 'Workbench batch requires an active ACCDB source controller.';
    controller.render();
    return null;
  }

  const batch = controller.stagedBatch;
  if (!batch) {
    controller.batchError = 'No changes staged for batch preview. Choose a preset or stage edits.';
    controller.render();
    return null;
  }

  const snapshot = typeof accdbController.getWorkbenchSnapshot === 'function'
    ? accdbController.getWorkbenchSnapshot()
    : {};

  const approver = String(controller.reviewerIdentity ?? '').trim();
  const reason = String(controller.reviewReason ?? '').trim();
  // Settings-only preparation does not change source property ownership and
  // must not fabricate a reviewer identity. Property edits still require both.
  if ((batch.propertyPatches ?? []).length > 0 && (!approver || !reason)) {
    controller.batchError = 'Confirmed reviewer identity and reason are required for property corrections.';
    controller.stagedToken = null;
    controller.previewDisclosure = null;
    controller.render();
    return null;
  }

  const request = {
    ...snapshot,
    propertyPatches: batch.propertyPatches ?? [],
    componentBasis: batch.componentBasis,
    requestedProfileId: batch.requestedProfileId,
    requestedCaseIds: batch.requestedCaseIds,
    approver,
    reason,
  };

  try {
    const disclosure = accdbController.previewWorkbenchBatch(request);
    controller.stagedToken = disclosure.token;
    controller.previewDisclosure = disclosure;
    controller.batchError = '';
    controller.render();
    return disclosure;
  } catch (err) {
    controller.batchError = err instanceof Error ? err.message : String(err);
    controller.stagedToken = null;
    controller.previewDisclosure = null;
    controller.render();
    return null;
  }
}

export function applyBatch(controller) {
  const accdbController = controller.options.getAccdbController?.();
  if (!accdbController || !controller.stagedToken) {
    return null;
  }
  try {
    const result = accdbController.applyWorkbenchBatch(controller.stagedToken);
    controller.stagedToken = null;
    controller.previewDisclosure = null;
    controller.stagedBatch = null;
    controller.batchError = '';
    controller.refresh();
    return result;
  } catch (err) {
    controller.batchError = err instanceof Error ? err.message : String(err);
    controller.render();
    return null;
  }
}

export function undoBatch(controller) {
  const accdbController = controller.options.getAccdbController?.();
  if (!accdbController || typeof accdbController.undoWorkbenchBatch !== 'function') {
    return null;
  }
  try {
    const result = accdbController.undoWorkbenchBatch();
    controller.stagedToken = null;
    controller.previewDisclosure = null;
    controller.stagedBatch = null;
    controller.batchError = '';
    controller.refresh();
    return result;
  } catch (err) {
    controller.batchError = err instanceof Error ? err.message : String(err);
    controller.render();
    return null;
  }
}

export function runPrototype(controller) {
  const accdbController = controller.options.getAccdbController?.();
  const cases = accdbController?.requestedCaseIds
    ?? controller.presentation?.preFlight?.preparation?.requestedCaseIds
    ?? controller.preFlight?.preparation?.requestedCaseIds
    ?? ['IXP-W'];

  if (typeof controller.options.onRunPrototype === 'function') {
    controller.options.onRunPrototype(cases);
  } else if (typeof controller.options.onAnalyze === 'function') {
    controller.options.onAnalyze(cases);
  }
  if (typeof controller.options.onContinueFromErrorCheck === 'function') {
    controller.options.onContinueFromErrorCheck();
  }
}
