#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const path = 'scripts/lfea-issue947-bend-descendant-condensation-audit.mjs';
let text = fs.readFileSync(path, 'utf8');

replaceOnce(
  `requirePinnedPackage(pkg);\nconst sourceRows = sourceElementIds.map((id) => requireSourceRow(pkg, id));`,
  `requirePinnedPackage(pkg);\nassert.equal(pkg.profile.conventions.restraintReaction, 'CAESAR_FORCE_ON_SUPPORT');\nconst caseRecord = pkg.cases.find((entry) => String(entry.caseId) === CASE_ID);\nif (!caseRecord) throw new TypeError(\`Pinned package lacks physical case \${CASE_ID}.\`);\nconst caseHasNodalForcePrimitive = /(^|[+\\-])F\\d+/u.test(String(caseRecord.formula).replace(/\\s+/gu, ''));\nconst sourceRows = sourceElementIds.map((id) => requireSourceRow(pkg, id));`,
);

replaceOnce(`  referenceBoundaryUnrestrained: boundaryCustody.every((entry) => entry.restraintCount === 0) ? 'PASS' : 'FAIL',
  referenceBoundaryOtherIncidentActionsComplete: boundaryCustody.every((entry) => entry.otherIncidentSourceElementIds.length > 0
    && entry.otherIncidentSourceElementIds.length === entry.directReferenceActionElementIds.length) ? 'PASS' : 'FAIL',`, `  referenceBoundaryEquilibriumRecoverable: !caseHasNodalForcePrimitive
    && boundaryCustody.every((entry) => entry.restraintCount === 0 || entry.reportedReactionAvailable) ? 'PASS' : 'FAIL',
  referenceBoundaryOtherIncidentActionsComplete: boundaryCustody.every((entry) => entry.otherIncidentSourceElementIds.length > 0
    && entry.otherIncidentSourceElementIds.length === entry.directReferenceActionElementIds.length) ? 'PASS' : 'FAIL',`);

replaceOnce(
  `    rule: 'At each unrestrained source boundary, target bend end action equals the negative sum of every other incident source-element end action. Every other incident source element must have a direct pinned L19 action row.',\n    boundaries: boundaryCustody,`,
  `    rule: 'At each source boundary, target end action equals reported CAESAR_FORCE_ON_SUPPORT reaction minus every other incident source-element end action. At an unrestrained boundary the reported reaction term is zero. Restrained-boundary recovery is allowed only when the pinned reaction is present and the physical case has no nodal-force primitive.',\n    caseFormula: caseRecord.formula,\n    caseHasNodalForcePrimitive,\n    boundaries: boundaryCustody,`,
);
replaceOnce(
  `    junctionReferenceAction: 'q_target,end = -sum(q_other_incident,end)',`,
  `    junctionReferenceAction: 'q_target,end = Q_pipe_on_support - sum(q_other_incident,end)',`,
);
replaceOnce(
  `  falsificationRule: \`No \${sourceLabel} constitutive conclusion is admissible unless exact production descendant condensation reproduces solved descendant boundary actions within 1e-3 N/Nm, both outer source boundaries are unrestrained and fully recoverable from direct neighboring source actions, and zero CAESAR rotations are propagated as +/-0.0001 degree uncertainty rather than replaced.\`,`,
  `  falsificationRule: \`No \${sourceLabel} constitutive conclusion is admissible unless exact production descendant condensation reproduces solved descendant boundary actions within 1e-3 N/Nm, both outer source boundaries are fully recoverable from direct neighboring source actions plus any pinned CAESAR_FORCE_ON_SUPPORT reaction, the physical case has no nodal-force primitive at a reaction-assisted boundary, and zero CAESAR rotations are propagated as +/-0.0001 degree uncertainty rather than replaced.\`,`,
);

replaceOnce(`    const restraintCount = restraintRows.filter((row) => String(row.NODE ?? row.NODE_NUM ?? '') === nodeId).length;
    return {
      nodeId,
      restraintCount,
      otherIncidentSourceElementIds: other.map((row) => String(row.ELEMENTID)),
      directReferenceActionElementIds,
    };`, `    const restraintCount = restraintRows.filter((row) => String(row.NODE ?? row.NODE_NUM ?? '') === nodeId).length;
    const reportedReaction = restraintCount > 0
      ? directReferenceReaction(pkg.references[CASE_ID].rows, nodeId)
      : new Array(6).fill(0);
    return {
      nodeId,
      restraintCount,
      reportedReactionAvailable: reportedReaction !== null,
      reportedReaction,
      otherIncidentSourceElementIds: other.map((row) => String(row.ELEMENTID)),
      directReferenceActionElementIds,
    };`);

replaceOnce(`    const sum = new Array(6).fill(0);
    for (const vector of vectors) for (let index = 0; index < 6; index += 1) sum[index] += vector[index];
    return sum.map((value) => -value);`, `    const sum = new Array(6).fill(0);
    for (const vector of vectors) for (let index = 0; index < 6; index += 1) sum[index] += vector[index];
    if (boundary.reportedReaction === null) {
      throw new TypeError(\`Boundary node \${boundary.nodeId} is restrained but lacks a complete pinned reaction vector.\`);
    }
    return boundary.reportedReaction.map((value, index) => value - sum[index]);`);

const insertionAnchor = `function hasDirectSourceAction(rows, row) {`;
const helper = `function directReferenceReaction(rows, nodeId) {
  const candidates = rows.filter((entry) => entry.entityKind === 'NODE' && String(entry.entityId) === String(nodeId));
  const index = new Map(candidates.map((entry) => [\`\${entry.quantity}:\${entry.component}\`, Number(entry.value)]));
  const keys = [
    ['FORCE', 'UX'], ['FORCE', 'UY'], ['FORCE', 'UZ'],
    ['MOMENT', 'RX'], ['MOMENT', 'RY'], ['MOMENT', 'RZ'],
  ];
  const values = keys.map(([quantity, component]) => index.get(\`\${quantity}:\${component}\`));
  return values.every(Number.isFinite) ? values : null;
}

function hasDirectSourceAction(rows, row) {`;
replaceOnce(insertionAnchor, helper);

assert.equal(text.includes('referenceBoundaryUnrestrained'), false);
assert.equal(text.includes('referenceBoundaryEquilibriumRecoverable'), true);
assert.equal(text.includes('directReferenceReaction'), true);
assert.equal(text.includes('CAESAR_FORCE_ON_SUPPORT'), true);
fs.writeFileSync(path, text);
console.log(JSON.stringify({
  check: 'lfea-issue947-apply-restrained-boundary-custody',
  status: 'PASS',
  path,
  governingBoundaryEquation: 'Q_TARGET=Q_PIPE_ON_SUPPORT-SUM_Q_OTHER_INCIDENT',
  nodalForceCaseGuard: true,
  solverBehaviorChanged: false,
}, null, 2));

function replaceOnce(before, after) {
  assert.equal(count(text, before), 1, `expected exactly one patch anchor:\n${before.slice(0, 140)}`);
  text = text.replace(before, after);
}
function count(haystack, needle) { return haystack.split(needle).length - 1; }
