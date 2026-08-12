import { semanticHash } from '../core/shared-piping-model/canonical-json.js';
import { codeStationFor } from './native-b31-code-stations.js';
import { lfeaNativeB31Error } from './native-b31-authority-contract.js';

/** Bind reviewed check intent to exact retained frame/section/material parents. */
export function buildLfeaNativeB31ApplicationChecks(preFlight, chains, authority) {
  const structural = preFlight.preparation.structuralPreparation;
  const materials = new Map(structural.materialResolutions.map((row) => [row.semanticHash, row]));
  const sections = new Map(structural.sectionResolutions.map((row) => [row.semanticHash, row]));
  const chainById = new Map(chains.map((row) => [row.caseId, row]));
  return authority.checks.map((check) => {
    const { component, station } = codeStationFor(
      authority.codeStationAuthority,
      check.elementId,
      check.end,
    );
    const evaluationCase = chainById.get(check.evaluationCaseId);
    const frameElementRecord = evaluationCase?.frameElementById?.[check.elementId];
    const sectionResolution = sections.get(component.analysisSectionSemanticHash);
    const materialResolution = materials.get(component.materialResolutionSemanticHash);
    if (!evaluationCase || !frameElementRecord || !sectionResolution || !materialResolution) {
      throw lfeaNativeB31Error(
        'LFEA_NATIVE_B31_CHECK_PARENT_MISSING',
        `B31 check ${check.checkId} lacks exact frame/section/material authority.`,
      );
    }
    return {
      checkId: check.checkId,
      category: check.category,
      codePointId: station.stationId,
      componentId: component.componentId,
      combinationId: check.combinationId,
      actionSource: check.actionSource,
      frameElementRecord,
      sectionResolution,
      sustainedSectionResolution: null,
      materialResolution,
      stressFactorSet: check.stressFactorSet,
      pressureStressContribution: check.pressureStressContribution,
      coldTemperature: check.coldTemperature,
      sustainedStress: check.sustainedStress,
      occasionalCategoryId: check.occasionalCategoryId,
    };
  });
}

export function lfeaNativeB31ApplicationId(authority, recoveryBatchHash) {
  const hash = semanticHash({ authority: authority.semanticHash, recoveryBatchHash });
  return `LFEA-B31-${hash.slice('fnv1a64:'.length).toUpperCase()}`;
}
