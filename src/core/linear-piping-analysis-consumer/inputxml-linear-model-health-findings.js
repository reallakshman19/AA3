import { semanticHash } from '../shared-piping-model/canonical-json.js';
import {
  DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_PROFILE,
  STRICT_INPUTXML_LINEAR_STATIC_PROFILE,
} from './inputxml-model-health-profile.js';
import {
  addProfileEffect,
  aggregateDiagnosticEntities,
  compareAscii,
  compareFinding,
  modelHealthEffect,
  modelHealthFinding,
  requireUniqueFindingIds,
  worstDisposition,
} from './inputxml-linear-model-health-finding-support.js';

export function collectInputXmlLinearModelHealthFindings({ sourceBundle, graph, proximity, inventory }) {
  const findings = [
    ...sourceIntegrityFindings(sourceBundle),
    ...topologyFindings(graph, 'TOPOLOGY_GRAPH'),
    ...topologyFindings(proximity, 'TOPOLOGY_PROXIMITY'),
    ...inventoryFindings(inventory),
    ...duplicateRestraintFindings(inventory),
    ...deferredPreparationFindings(inventory),
  ].sort(compareFinding);
  requireUniqueFindingIds(findings);
  return findings;
}

function sourceIntegrityFindings(sourceBundle) {
  const unique = new Map();
  for (const diagnostic of [
    ...(sourceBundle.diagnostics ?? []),
    ...(sourceBundle.geometry?.diagnostics ?? []),
  ]) {
    if (String(diagnostic?.severity ?? '').toLowerCase() !== 'error') continue;
    unique.set(semanticHash(diagnostic), diagnostic);
  }
  const grouped = new Map();
  for (const diagnostic of unique.values()) {
    const code = diagnostic.code || 'INPUTXML_SOURCE_ERROR';
    if (!grouped.has(code)) grouped.set(code, []);
    grouped.get(code).push(diagnostic);
  }
  const rows = [];
  for (const [code, diagnostics] of [...grouped.entries()].sort(([left], [right]) => compareAscii(left, right))) {
    const occurrences = diagnostics
      .map((row) => structuredClone(row))
      .sort((left, right) => compareAscii(semanticHash(left), semanticHash(right)));
    rows.push(modelHealthFinding({
      code,
      category: 'SOURCE',
      severity: 'error',
      occurrenceKey: `SOURCE_ERROR:${code}`,
      message: `${occurrences.length} InputXML source diagnostic occurrence(s) report ${code}.`,
      entities: aggregateDiagnosticEntities(occurrences),
      evidence: { occurrences },
      authority: sourceBundle.schema,
      remediation: 'Correct the source declaration and parse the model again.',
      capabilityEffects: { SOURCE_ACCEPTANCE: modelHealthEffect('BLOCK', code) },
    }));
  }
  if (sourceBundle.geometry?.valid !== true && rows.length === 0) {
    rows.push(modelHealthFinding({
      code: 'INPUTXML_SOURCE_GEOMETRY_INVALID',
      category: 'SOURCE',
      severity: 'error',
      occurrenceKey: 'SOURCE_GEOMETRY_INVALID',
      message: 'The retained InputXML source bundle does not contain valid canonical geometry.',
      evidence: { geometryValid: sourceBundle.geometry?.valid ?? null },
      authority: sourceBundle.schema,
      remediation: 'Resolve source and canonical geometry errors before analysis.',
      capabilityEffects: {
        SOURCE_ACCEPTANCE: modelHealthEffect('BLOCK', 'INPUTXML_SOURCE_GEOMETRY_INVALID'),
      },
    }));
  }
  return rows;
}

function topologyFindings(report, category) {
  return report.findings.map((row) => {
    const sourceEffects = Array.isArray(row.capabilityEffects) ? row.capabilityEffects : [];
    const disposition = sourceEffects.some((entry) => entry.effect === 'BLOCK') ? 'BLOCK' : 'CONDITIONAL';
    return modelHealthFinding({
      code: row.code,
      category,
      severity: disposition === 'BLOCK' ? 'error' : 'warning',
      occurrenceKey: row.findingId,
      message: row.message,
      entities: row.entities,
      evidence: { sourceFinding: row },
      authority: report.schema,
      remediation: row.remediation,
      capabilityEffects: { TOPOLOGY_ACCEPTANCE: modelHealthEffect(disposition, row.code) },
    });
  });
}

function inventoryFindings(inventory) {
  const rows = [];
  for (const item of inventory) {
    if (!item.active || item.classification?.mechanicsOwnedByInventoryId) continue;
    const strict = item.dispositionByProfile[STRICT_INPUTXML_LINEAR_STATIC_PROFILE];
    const approximate = item.dispositionByProfile[DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_PROFILE];
    const effects = {};
    addProfileEffect(effects, 'STRICT_LINEAR_STATIC', strict);
    addProfileEffect(effects, 'APPROXIMATE_LINEAR_STATIC', approximate);
    if (item.sourceKind === 'SIF' && item.classification?.codeInputSupported === false) {
      effects.CODE_STRESS_INPUT_READINESS = modelHealthEffect('BLOCK', 'MODEL_SIF_TYPE_UNSUPPORTED');
    }
    if (Object.keys(effects).length === 0) continue;
    const worst = worstDisposition(Object.values(effects).map((row) => row.disposition));
    const limitationCode = effects.CODE_STRESS_INPUT_READINESS?.limitationCode
      ?? strict.limitationCode ?? approximate.limitationCode ?? 'MODEL_FEATURE_LIMITATION';
    rows.push(modelHealthFinding({
      code: limitationCode,
      category: item.sourceKind === 'RESTRAINT'
        ? 'RESTRAINT'
        : item.sourceKind === 'SIF' || item.sourceKind === 'ALLOWABLE_STRESS'
          ? 'CODE_INPUT' : 'REPRESENTABILITY',
      severity: worst === 'BLOCK' ? 'error' : 'warning',
      occurrenceKey: item.inventoryId,
      message: `${item.sourceKind} ${item.inventoryId} is ${strict.disposition} for the strict profile and ${approximate.disposition} for the disclosed approximation profile.`,
      entities: {
        nodeIds: item.targetIds.nodeIds,
        segmentIds: item.targetIds.segmentIds,
        sourceFeatureIds: item.sourceFeatureId ? [item.sourceFeatureId] : [],
        sourceIndices: [item.sourceIndex],
      },
      evidence: {
        inventoryId: item.inventoryId,
        sourceRecordSemanticHash: item.sourceRecordSemanticHash,
        classification: item.classification,
        dispositionByProfile: item.dispositionByProfile,
      },
      authority: 'CURRENT_GENERIC_INPUTXML_REPRESENTABILITY_V1',
      remediation: 'Implement the missing mechanics or use only a profile whose declared limitation is acceptable; the source feature is not silently omitted.',
      capabilityEffects: effects,
    }));
  }
  return rows;
}

function duplicateRestraintFindings(inventory) {
  const groups = new Map();
  for (const row of inventory) {
    if (!row.active || row.sourceKind !== 'RESTRAINT') continue;
    const nodeId = row.classification?.nodeId;
    const targetDofs = row.classification?.targetDofs ?? [];
    if (nodeId === null || nodeId === undefined || targetDofs.length === 0) continue;
    for (const targetDof of targetDofs) {
      const key = `${nodeId}:${targetDof}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
  }
  return [...groups.entries()]
    .filter(([, rows]) => rows.length > 1)
    .sort(([left], [right]) => compareAscii(left, right))
    .map(([key, rows]) => {
      const [nodeId, targetDof] = key.split(':');
      return modelHealthFinding({
        code: 'MODEL_RESTRAINT_TARGET_DUPLICATE',
        category: 'RESTRAINT',
        severity: 'error',
        occurrenceKey: key,
        message: `${rows.length} retained restraints target ${key}; the current Map-based compiler would collapse declarations by node and DOF.`,
        entities: { nodeIds: [nodeId], sourceFeatureIds: rows.map((row) => row.sourceFeatureId) },
        evidence: { targetDof, inventoryIds: rows.map((row) => row.inventoryId).sort(compareAscii) },
        authority: 'CURRENT_GENERIC_INPUTXML_REPRESENTABILITY_V1',
        remediation: 'Resolve duplicate restraint intent explicitly before constraint compilation.',
        capabilityEffects: {
          STRICT_LINEAR_STATIC: modelHealthEffect('BLOCK', 'MODEL_RESTRAINT_TARGET_DUPLICATE'),
          APPROXIMATE_LINEAR_STATIC: modelHealthEffect('BLOCK', 'MODEL_RESTRAINT_TARGET_DUPLICATE'),
        },
      });
    });
}

function deferredPreparationFindings(inventory) {
  const activeTemperatureCount = inventory.filter((row) => row.active && row.sourceKind === 'TEMPERATURE_INPUT').length;
  const thermalFinding = activeTemperatureCount === 0
    ? modelHealthFinding({
      code: 'MODEL_OPERATING_TEMPERATURE_NOT_DECLARED', category: 'LOAD', severity: 'error',
      occurrenceKey: 'THERMAL_AUTHORITY',
      message: 'No active operating temperature is retained; a thermal operating case is unavailable.',
      evidence: { activeTemperatureCount }, authority: 'INPUTXML_MODEL_HEALTH_SOURCE',
      remediation: 'Declare an operating temperature when an operating thermal case is required.',
      capabilityEffects: { THERMAL_AUTHORITY: modelHealthEffect('BLOCK', 'MODEL_OPERATING_TEMPERATURE_NOT_DECLARED') },
    })
    : modelHealthFinding({
      code: 'THERMAL_PROFILE_PREPARATION_REQUIRED', category: 'PREPARATION_BOUNDARY', severity: 'warning',
      occurrenceKey: 'THERMAL_AUTHORITY',
      message: 'Thermal material/alpha authority is retained for a later profile-preparation slice.',
      evidence: { preparationImplemented: false, activeTemperatureCount }, authority: 'MODEL_HEALTH_SEQUENCE',
      remediation: 'Prepare and seal the thermal authority before enabling an operating case.',
      capabilityEffects: { THERMAL_AUTHORITY: modelHealthEffect('CONDITIONAL', 'THERMAL_PROFILE_PREPARATION_REQUIRED') },
    });
  return [thermalFinding,
    deferredFinding('SUSTAINED_PROFILE_PREPARATION_REQUIRED', 'SUSTAINED_CASES',
      'Material, section, and sustained-load preparation is not implemented in this diagnostic slice.',
      ['SUSTAINED_CASE_STRICT', 'SUSTAINED_CASE_APPROXIMATE']),
    deferredFinding('OPERATING_PROFILE_PREPARATION_REQUIRED', 'OPERATING_CASES',
      'Operating-load preparation is not implemented in this diagnostic slice.',
      ['OPERATING_CASE_STRICT', 'OPERATING_CASE_APPROXIMATE']),
    deferredFinding('CODE_STRESS_PROFILE_PREPARATION_REQUIRED', 'CODE_STRESS_INPUT_READINESS',
      'Code-stress input custody is inventoried, but code-stress preparation and evaluation are not performed here.',
      ['CODE_STRESS_INPUT_READINESS'], true)];
}

function deferredFinding(code, occurrenceKey, message, capabilityIds, codeStress) {
  const capabilityEffects = Object.fromEntries(capabilityIds.map((id) => [id, modelHealthEffect('CONDITIONAL', code)]));
  return modelHealthFinding({
    code, category: 'PREPARATION_BOUNDARY', severity: 'warning', occurrenceKey, message,
    evidence: codeStress ? { preparationImplemented: false, evaluationImplemented: false } : { preparationImplemented: false },
    authority: 'MODEL_HEALTH_SEQUENCE',
    remediation: codeStress
      ? 'Prepare code inputs and run a separately qualified code evaluation before claiming readiness.'
      : `Prepare and seal the selected ${occurrenceKey === 'SUSTAINED_CASES' ? 'sustained' : 'operating'} profile before execution.`,
    capabilityEffects,
  });
}
