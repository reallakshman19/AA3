export function lfeaStandaloneJourneyStatus(journey, resultsState, recentSourceMetadata) {
  if (journey.source.status === 'EMPTY') return emptyStatus(recentSourceMetadata);
  if (resultsState?.currentness === 'STALE') {
    return 'Retained recovered Results are STALE relative to current raw/source/model authority; current engineering values are hidden.';
  }
  if (resultsState?.currentness === 'CURRENT') {
    return 'Current governed B-3.4 recovery is available in Results. Raw and recovered quantities remain separate authorities.';
  }
  if (journey.analysis.executionCurrentness === 'STALE') {
    return 'A retained native execution is STALE relative to current source/review/model authority; it is not current evidence.';
  }
  if (journey.analysis.currentQualifiedExecutionAvailable) {
    return 'Current native raw solver execution is qualified. Governed B-3.4 recovery can produce current Results.';
  }
  if (journey.analysis.status === 'BLOCKED') {
    return 'Native InputXML pre-FEA is BLOCKED. Review retained findings; no solve authorization exists.';
  }
  if (journey.analysis.readyToRun) {
    return 'Reviewed pre-FEA authorization is sealed. Native raw solve execution is ready.';
  }
  if (journey.review.status === 'REVIEW_REQUIRED') {
    return 'Native InputXML pre-FEA requires explicit engineering review before solve authorization can be sealed.';
  }
  return 'Native InputXML source is retained; complete governed pre-FEA preparation before execution.';
}

function emptyStatus(recent) {
  if (!recent) {
    return 'Import a governed CAESAR II InputXML source to begin Source → Review → Model preparation.';
  }
  return `No governed source is loaded. Recent source metadata only: ${recent.fileName} · ${recent.contentSha256.slice(0, 12)}…. Re-import is required before Review or Analysis.`;
}
