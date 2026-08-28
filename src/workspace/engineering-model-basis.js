const PROJECT_DATA_TOPOLOGY_MODEL_PATHS = Object.freeze([
  'topology.supportSiteGroupingToleranceMm',
  'topology.portMatchToleranceMm',
  'topology.autoCarrierCoincidenceToleranceMm',
  'topology.routeJoiningRules',
]);

/**
 * Runtime-only dependency projection for the derived support-site/route models.
 * It is not serialized, hashed into engineering evidence, or used as authority.
 */
export function projectDataTopologyModelBasis(profile) {
  return JSON.stringify(PROJECT_DATA_TOPOLOGY_MODEL_PATHS.map((path) => {
    const [groupKey, fieldKey] = path.split('.');
    return stableRuntimeValue(profile?.[groupKey]?.[fieldKey]?.value ?? null);
  }));
}

export function commonInputConfigurationBasis(snapshot) {
  return JSON.stringify(stableRuntimeValue(snapshot?.configuration || null));
}

function stableRuntimeValue(value) {
  if (Array.isArray(value)) return value.map(stableRuntimeValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableRuntimeValue(value[key])]));
}
