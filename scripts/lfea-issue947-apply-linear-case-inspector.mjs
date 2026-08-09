#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const path = 'src/core/fea-benchmarks/caesar-accdb-linear-solve.js';
let text = fs.readFileSync(path, 'utf8');

const solveAnchor = `/** Solve every selected physical case and emit normalized comparison rows plus mechanics evidence. */
export function solveCaesarAccdbLinearBenchmark(benchmarkPackage) {`;
const inspector = `/**
 * Read-only mechanics inspection for qualification diagnostics.
 *
 * This intentionally calls the same solveCase path as the benchmark solve and
 * exposes only matrices/load vectors already sealed in each element's solver
 * contribution. It does not recompute stiffness, alter assembly, or provide a
 * second solver path.
 */
export function inspectCaesarAccdbLinearCaseMechanics(benchmarkPackage, caseId) {
  requireBenchmarkPackage(benchmarkPackage);
  const solveProfile = benchmarkPackage.profile.linearSolve;
  if (solveProfile === null) throw new TypeError('The ACCDB profile does not declare linearSolve authorities.');
  const matches = benchmarkPackage.cases.filter((entry) => String(entry.caseId) === String(caseId));
  if (matches.length !== 1) {
    throw new TypeError(\`ACCDB mechanics inspection requires exactly one case \${String(caseId)}; found \${matches.length}.\`);
  }
  const solved = solveCase(benchmarkPackage, matches[0], solveProfile);
  return deepFreeze({
    schema: 'lfea-accdb-linear-case-mechanics-inspection/v1',
    sourceAccdbSha256: benchmarkPackage.source.sha256,
    caseId: String(matches[0].caseId),
    executionStatus: solved.execution.status,
    executionSemanticHash: solved.execution.semanticHash,
    executionEvidenceHash: solved.execution.evidenceHash,
    rows: solved.rows.map((entry) => ({ ...entry })),
    elements: solved.analysisElements.map((entry) => ({
      elementId: entry.elementId,
      sourceElementId: entry.sourceElementId,
      nodeI: entry.nodeI,
      nodeJ: entry.nodeJ,
      kind: entry.kind,
      teeJunctionNodeId: entry.teeJunctionNodeId,
      globalStiffness: [...entry.contribution.globalStiffness],
      equivalentLoadGlobal: [...entry.contribution.equivalentLoadGlobal],
      initialStrainLoadGlobal: [...entry.contribution.initialStrainLoadGlobal],
      effectiveLocalStiffness: [...entry.effectiveLocalStiffness],
      pressureAxialStrain: entry.pressureAxialStrain,
      bourdonRotationRadians: entry.bourdonRotationRadians,
      bourdonFreeEndTranslationM: [...entry.bourdonFreeEndTranslationM],
      gravityWeightN: entry.gravityWeightN,
    })),
  });
}

/** Solve every selected physical case and emit normalized comparison rows plus mechanics evidence. */
export function solveCaesarAccdbLinearBenchmark(benchmarkPackage) {`;

assert.equal(count(text, solveAnchor), 1, 'expected exactly one benchmark solve export anchor');
assert.equal(count(text, 'export function inspectCaesarAccdbLinearCaseMechanics'), 0, 'mechanics inspector already exists');
text = text.replace(solveAnchor, inspector);

const returnAnchor = `  return {
    execution,
    rows: resultRows({ benchmarkPackage, execution, recovered, analysis }),
    evidence: {`;
const returnReplacement = `  return {
    execution,
    rows: resultRows({ benchmarkPackage, execution, recovered, analysis }),
    analysisElements: analysis.elements,
    evidence: {`;
assert.equal(count(text, returnAnchor), 1, 'expected exactly one solveCase return anchor');
text = text.replace(returnAnchor, returnReplacement);

assert.equal(count(text, 'analysisElements: analysis.elements'), 1);
assert.equal(count(text, 'globalStiffness: [...entry.contribution.globalStiffness]'), 1);
assert.equal(count(text, 'equivalentLoadGlobal: [...entry.contribution.equivalentLoadGlobal]'), 1);
assert.equal(count(text, 'initialStrainLoadGlobal: [...entry.contribution.initialStrainLoadGlobal]'), 1);

fs.writeFileSync(path, text);
console.log(JSON.stringify({
  check: 'lfea-issue947-apply-linear-case-inspector',
  status: 'PASS',
  path,
  semantics: 'READ_ONLY_SAME_SOLVECASE_SAME_SEALED_ELEMENT_CONTRIBUTIONS',
  solverBehaviorChanged: false,
}, null, 2));

function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}
