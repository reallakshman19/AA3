import {
  INPUTXML_MODEL_HEALTH_CAPABILITIES,
  INPUTXML_MODEL_HEALTH_CAPABILITY_DEPENDENCIES,
} from './inputxml-model-health-profile.js';
import { uniqueAscii } from './inputxml-linear-model-health-finding-support.js';

const EFFECT_RANK = Object.freeze({ PASS: 0, CONDITIONAL: 1, BLOCK: 2 });

export function foldInputXmlLinearModelHealthCapabilities(findings) {
  const rows = new Map();
  for (const capabilityId of INPUTXML_MODEL_HEALTH_CAPABILITIES) {
    const dependencyIds = INPUTXML_MODEL_HEALTH_CAPABILITY_DEPENDENCIES[capabilityId];
    if (!Array.isArray(dependencyIds)) {
      throw new TypeError(`Capability ${capabilityId} has no dependency declaration.`);
    }
    rows.set(capabilityId, {
      capabilityId,
      ownStatus: 'PASS',
      status: 'PASS',
      dependencyIds: [...dependencyIds],
      dependencyEffects: [],
      findingIds: [],
      limitationCodes: [],
    });
  }
  for (const findingRow of findings) {
    for (const [capabilityId, capabilityEffect] of Object.entries(findingRow.capabilityEffects)) {
      const row = rows.get(capabilityId);
      if (!row) throw new TypeError(`Finding ${findingRow.findingId} names unknown capability ${capabilityId}.`);
      if (EFFECT_RANK[capabilityEffect.disposition] > EFFECT_RANK[row.ownStatus]) {
        row.ownStatus = capabilityEffect.disposition;
      }
      row.status = row.ownStatus;
      row.findingIds.push(findingRow.findingId);
      if (capabilityEffect.limitationCode) row.limitationCodes.push(capabilityEffect.limitationCode);
    }
  }
  for (let pass = 0; pass < INPUTXML_MODEL_HEALTH_CAPABILITIES.length; pass += 1) {
    let changed = false;
    for (const capabilityId of INPUTXML_MODEL_HEALTH_CAPABILITIES) {
      const row = rows.get(capabilityId);
      let status = row.ownStatus;
      const dependencyEffects = [];
      for (const dependencyId of row.dependencyIds) {
        const dependency = rows.get(dependencyId);
        if (!dependency) throw new TypeError(`Capability ${capabilityId} depends on unknown capability ${dependencyId}.`);
        if (EFFECT_RANK[dependency.status] > EFFECT_RANK[status]) status = dependency.status;
        if (dependency.status !== 'PASS') {
          dependencyEffects.push(Object.freeze({ capabilityId: dependencyId, disposition: dependency.status }));
        }
      }
      if (status !== row.status) changed = true;
      row.status = status;
      row.dependencyEffects = dependencyEffects;
    }
    if (!changed) break;
    if (pass === INPUTXML_MODEL_HEALTH_CAPABILITIES.length - 1) {
      throw new TypeError('InputXML model-health capability dependencies did not converge.');
    }
  }
  return Object.freeze(INPUTXML_MODEL_HEALTH_CAPABILITIES.map((capabilityId) => {
    const row = rows.get(capabilityId);
    return Object.freeze({
      capabilityId,
      ownStatus: row.ownStatus,
      status: row.status,
      dependencyIds: Object.freeze(row.dependencyIds),
      dependencyEffects: Object.freeze(row.dependencyEffects),
      findingIds: Object.freeze(uniqueAscii(row.findingIds)),
      limitationCodes: Object.freeze(uniqueAscii(row.limitationCodes)),
    });
  }));
}
