/** Compatibility-only lazy provider for deterministic simulated LAFEA sources. */
export async function createLafeaMockDocument(stageId) {
  const provider = await import('./advanced-mock-data.js');
  return provider.createLafeaMockDocument(stageId);
}
