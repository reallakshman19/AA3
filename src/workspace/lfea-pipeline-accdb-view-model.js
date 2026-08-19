import { ACCDB_ELEMENT_FIELD_SPECS } from '../core/linear-piping-analysis-consumer/accdb-source-binding.js';
import { foldInputXmlLinearModelHealthCapabilities } from '../core/linear-piping-analysis-consumer/inputxml-linear-model-health-capabilities.js';
import {
  capabilityAppliesToRequest,
  capabilityGatesSolve,
  requestedProfileFamily,
  scopedDisposition,
} from '../core/linear-piping-analysis-consumer/inputxml-linear-prefea-profile-scope.js';
import {
  DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_PROFILE,
  STRICT_INPUTXML_LINEAR_STATIC_PROFILE,
} from '../core/linear-piping-analysis-consumer/inputxml-model-health-profile.js';

export const LFEA_PIPELINE_ACCDB_PROFILE_IDS = Object.freeze([
  DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_PROFILE,
  STRICT_INPUTXML_LINEAR_STATIC_PROFILE,
]);

/** Matches LINEAR_PIPING_INPUTXML_DEFAULT_PROFILE_ID on the InputXML surface. */
export const LFEA_PIPELINE_ACCDB_DEFAULT_PROFILE_ID = DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_PROFILE;

export const LFEA_PIPELINE_ACCDB_PROFILE_LABELS = Object.freeze({
  [DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_PROFILE]: 'Disclosed approximation (accept declared limitations)',
  [STRICT_INPUTXML_LINEAR_STATIC_PROFILE]: 'Strict (exact mechanics only)',
});

const DISPOSITION_SEVERITY = Object.freeze({ BLOCK: 'error', CONDITIONAL: 'warning', PASS: 'info' });
const SEVERITY_RANK = Object.freeze({ info: 0, warning: 1, error: 2 });

/**
 * Findings sorted into the questions an engineer actually asks, in the order
 * they have to be answered: could the file be read, does the model hold
 * together geometrically, can this solver represent what it contains, and
 * what is deferred to a later stage. A single flat list forced them to sort
 * a hundred rows into these buckets by eye, every time.
 *
 * Each section states what its findings mean, because the categories are the
 * pipeline's own vocabulary, not something a reader can infer from the name.
 */
const FINDING_SECTIONS = Object.freeze([
  Object.freeze({
    sectionId: 'SOURCE',
    title: 'Source integrity',
    description: 'Whether the file itself could be read and converted. These block everything downstream.',
    categories: Object.freeze(['SOURCE']),
  }),
  Object.freeze({
    sectionId: 'TOPOLOGY',
    title: 'Model topology',
    description: 'Whether the geometry closes and connects: element routes, node coincidence, overlapping runs.',
    categories: Object.freeze(['TOPOLOGY_GRAPH', 'TOPOLOGY_PROXIMITY']),
  }),
  Object.freeze({
    sectionId: 'REPRESENTABILITY',
    title: 'Solver representability',
    description: 'Features the model declares and this solver represents exactly, approximately, or not at all. Under the disclosed approximation profile these are limitations to accept, not defects to fix.',
    categories: Object.freeze(['REPRESENTABILITY', 'RESTRAINT']),
  }),
  Object.freeze({
    sectionId: 'CODE_INPUT',
    title: 'Code-stress inputs',
    description: 'Inputs a later, separately qualified code evaluation would need. They never gate a linear solve here.',
    categories: Object.freeze(['CODE_INPUT']),
  }),
  Object.freeze({
    sectionId: 'PREPARATION',
    title: 'Deferred preparation',
    description: 'Stages this diagnostic slice does not perform. Expected on every model; they are disclosures, not faults.',
    categories: Object.freeze(['PREPARATION_BOUNDARY', 'LOAD']),
  }),
]);

const OTHER_SECTION = Object.freeze({
  sectionId: 'OTHER',
  title: 'Other findings',
  description: 'Findings whose category this panel does not yet sort.',
  categories: Object.freeze([]),
});

/**
 * Read a model-health report through one requested analysis profile.
 *
 * diagnoseInputXmlLinearModelHealth is deliberately profile-agnostic: it
 * reports BOTH profiles, and bakes each finding's severity from the worst
 * disposition across the two (see inventoryFindings). That is correct for an
 * authority record and wrong for a reader who has chosen a profile -- a bend
 * is STRICT=BLOCK / APPROXIMATE=CONDITIONAL, so a panel showing the baked
 * severity tells an engineer running the approximation profile that their
 * model is blocked by a limitation that profile exists to accept.
 *
 * This re-reads the same findings through the same scoping the pre-FEA gate
 * applies to a real run (scopedDisposition / capabilityAppliesToRequest /
 * capabilityGatesSolve), so what the panel shows and what a run would decide
 * cannot drift apart. Nothing is hidden: a finding scoped down to a warning
 * keeps its own message, which still names both profiles' dispositions.
 */
export function buildAccdbModelHealthViewModel(modelHealth, requestedProfileId) {
  if (!modelHealth) return null;
  const family = requestedProfileFamily(requestedProfileId ?? null);
  const findings = modelHealth.findings.map((finding) => scopeFinding(finding, family));
  const findingGroups = groupFindings(findings);
  return Object.freeze({
    requestedProfileId: requestedProfileId ?? null,
    capabilities: buildCapabilityRows(modelHealth, findings, family),
    findingGroups,
    findingSections: sectionFindingGroups(findingGroups),
    findingCount: findings.length,
    blockingCount: findings.filter((row) => row.severity === 'error').length,
  });
}

function scopeFinding(finding, family) {
  const scoped = scopedDisposition(finding.capabilityEffects, family);
  const severity = scoped === null ? finding.severity : (DISPOSITION_SEVERITY[scoped] ?? finding.severity);
  return Object.freeze({
    findingId: finding.findingId,
    code: finding.code,
    category: finding.category,
    severity,
    authoritySeverity: finding.severity,
    scopedByProfile: scoped !== null && severity !== finding.severity,
    message: finding.message,
    remediation: finding.remediation,
    entities: finding.entities,
  });
}

/**
 * Re-fold the capability table from the findings that apply to the requested
 * profile, using the core's own dependency folding rather than a second
 * implementation of it.
 *
 * Capabilities belonging to the other profile family are reported as
 * NOT_APPLICABLE instead of BLOCK: a strict-only capability is not a failure
 * of an approximate request, it is a path that request never takes.
 * CODE_STRESS_INPUT_READINESS keeps its real status but is flagged
 * gatesSolve: false -- this stage performs no code-stress evaluation at all,
 * so its readiness never gates a weight or weight+pressure solve.
 */
function buildCapabilityRows(modelHealth, findings, family) {
  const findingsById = new Map(modelHealth.findings.map((row) => [row.findingId, row]));
  const scopedSource = findings.map((row) => {
    const authority = findingsById.get(row.findingId);
    const effects = Object.fromEntries(Object.entries(authority.capabilityEffects)
      .filter(([capabilityId]) => capabilityAppliesToRequest(capabilityId, family)));
    return { findingId: row.findingId, capabilityEffects: effects };
  });
  const folded = foldInputXmlLinearModelHealthCapabilities(scopedSource);
  const authorityById = new Map(modelHealth.capabilities.map((row) => [row.capabilityId, row]));
  return Object.freeze(folded.map((row) => {
    const applies = capabilityAppliesToRequest(row.capabilityId, family);
    return Object.freeze({
      capabilityId: row.capabilityId,
      status: applies ? row.status : 'NOT_APPLICABLE',
      authorityStatus: authorityById.get(row.capabilityId)?.status ?? null,
      appliesToProfile: applies,
      gatesSolve: capabilityGatesSolve(row.capabilityId),
      limitationCodes: row.limitationCodes,
    });
  }));
}

/**
 * Collapse findings to one row per code.
 *
 * 96 bend elements report one fact about the solver 96 times; a flat list of
 * those buries the handful of findings that differ from each other. The
 * occurrences are kept in full on each group so nothing is lost -- the panel
 * renders them behind a disclosure, and the count is always visible.
 */
function groupFindings(findings) {
  const groups = new Map();
  for (const finding of findings) {
    if (!groups.has(finding.code)) {
      groups.set(finding.code, {
        code: finding.code,
        category: finding.category,
        severity: finding.severity,
        scopedByProfile: false,
        remediation: finding.remediation,
        occurrences: [],
      });
    }
    const group = groups.get(finding.code);
    if (SEVERITY_RANK[finding.severity] > SEVERITY_RANK[group.severity]) group.severity = finding.severity;
    if (finding.scopedByProfile) group.scopedByProfile = true;
    group.occurrences.push(finding);
  }
  return Object.freeze([...groups.values()]
    .map((group) => Object.freeze({
      ...group,
      count: group.occurrences.length,
      entityLabel: entityLabel(group.occurrences),
      occurrences: Object.freeze(group.occurrences),
    }))
    .sort(compareGroup));
}

/**
 * Sort the code groups into the sections above. Sections with nothing in
 * them are dropped rather than rendered empty, and a group whose category is
 * unknown to this list still appears -- under "Other" -- instead of silently
 * vanishing from a panel that claims to show every finding.
 */
function sectionFindingGroups(findingGroups) {
  const sectionById = new Map([...FINDING_SECTIONS, OTHER_SECTION].map((section) => [section.sectionId, []]));
  const sectionIdByCategory = new Map();
  for (const section of FINDING_SECTIONS) {
    for (const category of section.categories) sectionIdByCategory.set(category, section.sectionId);
  }
  for (const group of findingGroups) {
    const sectionId = sectionIdByCategory.get(group.category) ?? OTHER_SECTION.sectionId;
    sectionById.get(sectionId).push(group);
  }
  return Object.freeze([...FINDING_SECTIONS, OTHER_SECTION]
    .map((section) => {
      const groups = sectionById.get(section.sectionId);
      return Object.freeze({
        sectionId: section.sectionId,
        title: section.title,
        description: section.description,
        groups: Object.freeze(groups),
        occurrenceCount: groups.reduce((total, group) => total + group.count, 0),
        blockingCount: groups.filter((group) => group.severity === 'error')
          .reduce((total, group) => total + group.count, 0),
        severity: groups.reduce(
          (worst, group) => (SEVERITY_RANK[group.severity] > SEVERITY_RANK[worst] ? group.severity : worst),
          'info',
        ),
      });
    })
    .filter((section) => section.groups.length > 0));
}

function entityLabel(occurrences) {
  const ids = [];
  for (const occurrence of occurrences) {
    for (const id of occurrence.entities?.sourceFeatureIds ?? []) {
      if (!ids.includes(id)) ids.push(id);
    }
  }
  if (ids.length === 0) return '';
  const shown = ids.slice(0, 8).join(', ');
  return ids.length > 8 ? `${shown} …and ${ids.length - 8} more` : shown;
}

function compareGroup(left, right) {
  if (SEVERITY_RANK[right.severity] !== SEVERITY_RANK[left.severity]) {
    return SEVERITY_RANK[right.severity] - SEVERITY_RANK[left.severity];
  }
  if (right.count !== left.count) return right.count - left.count;
  return left.code < right.code ? -1 : left.code > right.code ? 1 : 0;
}

/**
 * One row per imported element, carrying every inventoried field as the
 * engineer sees it: the raw cell in the file's own declared unit (what an
 * override replaces), the converted SI value the analysis actually uses, and
 * the binding's disposition for that field (EXPLICIT / INHERITED / blank
 * sentinel), so an inherited or blank value is never mistaken for a declared
 * one.
 */
export function buildAccdbElementPropertyRows(sourceBundle) {
  if (!sourceBundle) return Object.freeze([]);
  return Object.freeze(sourceBundle.elementRecords.map((record) => Object.freeze({
    sourceFeatureId: record.sourceFeatureId,
    accdbElementId: record.accdbElementId,
    fromNodeId: record.fromNodeId,
    toNodeId: record.toNodeId,
    canonicalSegmentType: record.canonicalSegmentType,
    fields: Object.freeze(ACCDB_ELEMENT_FIELD_SPECS.map((spec) => {
      const evidence = record.fieldEvidence[spec.name] ?? null;
      return Object.freeze({
        name: spec.name,
        kind: spec.kind,
        rawValue: evidence?.rawValue ?? null,
        canonicalValue: evidence?.canonicalValue ?? null,
        disposition: evidence?.disposition ?? 'ABSENT',
      });
    })),
  })));
}
