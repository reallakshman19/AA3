/** Compatibility-only lazy provider for deterministic simulated LAFEA sources. */
export async function createLafeaMockDocument(stageId) {
  const provider = await import('./advanced-mock-data.js');
  return provider.createLafeaMockDocument(stageId);
}

export async function createLafeaMockDomainAndGeometryEvidence(stageId, sourceHash) {
  const provider = await import('./advanced-mock-data.js');
  if (typeof provider.createLafeaMockDomainAndGeometryEvidence === 'function') {
    return provider.createLafeaMockDomainAndGeometryEvidence(stageId, sourceHash);
  }
  return null;
}
