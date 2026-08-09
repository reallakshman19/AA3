#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const path = 'scripts/lfea-issue947-bend-descendant-condensation-audit.mjs';
let text = fs.readFileSync(path, 'utf8');

replaceOnce(`const args = parseArgs(process.argv.slice(2));
if (!args.package || !args['source-element']) {
  throw new TypeError('Usage: node scripts/lfea-issue947-bend-descendant-condensation-audit.mjs --package <canonical-package.json> --source-element <id> [--out <json>]');
}
const sourceElementId = String(args['source-element']);
const pkg = JSON.parse(readFileSync(args.package, 'utf8'));
requirePinnedPackage(pkg);
const sourceRow = requireSourceRow(pkg, sourceElementId);
if (!(Number(sourceRow.BEND_PTR) > 0)) throw new TypeError(\`Source E\${sourceElementId} is not a bend.\`);
const boundaryNodeIds = [String(sourceRow.FROM_NODE), String(sourceRow.TO_NODE)];
const boundaryCustody = boundaryReferenceCustody(pkg, sourceRow);
`, `const args = parseArgs(process.argv.slice(2));
if (!args.package || (!args['source-element'] && !args['source-elements'])) {
  throw new TypeError('Usage: node scripts/lfea-issue947-bend-descendant-condensation-audit.mjs --package <canonical-package.json> (--source-element <id> | --source-elements <id,id,...>) [--out <json>]');
}
const sourceElementIds = args['source-elements']
  ? String(args['source-elements']).split(',').map((value) => value.trim()).filter(Boolean)
  : [String(args['source-element'])];
if (sourceElementIds.length === 0 || new Set(sourceElementIds).size !== sourceElementIds.length) {
  throw new TypeError('Source-element chain must contain one or more unique source element ids.');
}
const sourceLabel = sourceElementIds.map((id) => \`E\${id}\`).join('_');
const pkg = JSON.parse(readFileSync(args.package, 'utf8'));
requirePinnedPackage(pkg);
const sourceRows = sourceElementIds.map((id) => requireSourceRow(pkg, id));
for (const row of sourceRows) {
  if (!(Number(row.BEND_PTR) > 0)) throw new TypeError(\`Source E\${row.ELEMENTID} is not a bend.\`);
}
for (let index = 0; index < sourceRows.length - 1; index += 1) {
  if (String(sourceRows[index].TO_NODE) !== String(sourceRows[index + 1].FROM_NODE)) {
    throw new TypeError(\`Source bend chain is not contiguous between E\${sourceRows[index].ELEMENTID} and E\${sourceRows[index + 1].ELEMENTID}.\`);
  }
}
const boundaryNodeIds = [String(sourceRows[0].FROM_NODE), String(sourceRows.at(-1).TO_NODE)];
const boundaryCustody = boundaryReferenceCustody(pkg, sourceElementIds, boundaryNodeIds);
`);

replaceOnce(`const descendants = inspection.elements.filter((entry) => entry.sourceElementId === sourceElementId);
if (descendants.length === 0) throw new TypeError(\`Production inspection has no descendants for source E\${sourceElementId}.\`);
const chain = requireOrderedChain(descendants, boundaryNodeIds[0], boundaryNodeIds[1]);
if (chain.filter((entry) => entry.kind === 'BEND_INCOMING_STRAIGHT').length > 1) {
  throw new TypeError(\`Source E\${sourceElementId} has multiple incoming-straight descendants.\`);
}
if (!chain.some((entry) => entry.kind === 'BEND_ARC')) {
  throw new TypeError(\`Source E\${sourceElementId} lacks bend-arc descendants.\`);
}
if (!chain.every((entry) => ['BEND_INCOMING_STRAIGHT', 'BEND_ARC'].includes(entry.kind))) {
  throw new TypeError(\`Source E\${sourceElementId} contains an unexpected descendant kind.\`);
}
`, `const sourceElementIdSet = new Set(sourceElementIds);
const descendants = inspection.elements.filter((entry) => sourceElementIdSet.has(String(entry.sourceElementId)));
if (descendants.length === 0) throw new TypeError(\`Production inspection has no descendants for source chain \${sourceLabel}.\`);
const chain = requireOrderedChain(descendants, boundaryNodeIds[0], boundaryNodeIds[1]);
for (const sourceElementId of sourceElementIds) {
  const sourceDescendants = chain.filter((entry) => String(entry.sourceElementId) === sourceElementId);
  if (sourceDescendants.filter((entry) => entry.kind === 'BEND_INCOMING_STRAIGHT').length > 1) {
    throw new TypeError(\`Source E\${sourceElementId} has multiple incoming-straight descendants.\`);
  }
  if (!sourceDescendants.some((entry) => entry.kind === 'BEND_ARC')) {
    throw new TypeError(\`Source E\${sourceElementId} lacks bend-arc descendants.\`);
  }
}
if (!chain.every((entry) => ['BEND_INCOMING_STRAIGHT', 'BEND_ARC'].includes(entry.kind))) {
  throw new TypeError(\`Source chain \${sourceLabel} contains an unexpected descendant kind.\`);
}
`);

replaceOnce(
  `const caesarSourceAction = inferredReferenceSourceAction(referenceRows, pkg, sourceRow, boundaryCustody);`,
  `const caesarSourceAction = inferredReferenceSourceAction(referenceRows, pkg, boundaryCustody);`,
);
replaceOnce(
  `  throw new Error(\`E\${sourceElementId} condensation prerequisite failed: \${JSON.stringify(gates)}\`);`,
  `  throw new Error(\`\${sourceLabel} condensation prerequisite failed: \${JSON.stringify(gates)}\`);`,
);
replaceOnce(`const classification = resolution.admissibleConstitutiveFailure
  ? \`E\${sourceElementId}_ADMISSIBLE_PRODUCTION_DESCENDANT_CONSTITUTIVE_MISMATCH\`
  : absNormalized[governingIndex] <= COMPONENT_LIMIT
    ? \`E\${sourceElementId}_PRODUCTION_DESCENDANT_CONSTITUTIVE_RESPONSE_PASSES_CAESAR_INJECTION\`
    : \`E\${sourceElementId}_RAW_MISMATCH_NON_RESOLVING_DUE_TO_PINNED_ROTATION_OUTPUT_RESOLUTION\`;`, `const classification = resolution.admissibleConstitutiveFailure
  ? \`\${sourceLabel}_ADMISSIBLE_PRODUCTION_DESCENDANT_CONSTITUTIVE_MISMATCH\`
  : absNormalized[governingIndex] <= COMPONENT_LIMIT
    ? \`\${sourceLabel}_PRODUCTION_DESCENDANT_CONSTITUTIVE_RESPONSE_PASSES_CAESAR_INJECTION\`
    : \`\${sourceLabel}_RAW_MISMATCH_NON_RESOLVING_DUE_TO_PINNED_ROTATION_OUTPUT_RESOLUTION\`;`);

replaceOnce(`  sourceElement: {
    sourceElementId,
    fromNode: boundaryNodeIds[0],
    toNode: boundaryNodeIds[1],
    bendPtr: Number(sourceRow.BEND_PTR),
  },`, `  sourceElement: sourceRows.length === 1 ? {
    sourceElementId: sourceElementIds[0],
    fromNode: boundaryNodeIds[0],
    toNode: boundaryNodeIds[1],
    bendPtr: Number(sourceRows[0].BEND_PTR),
  } : null,
  sourceElements: sourceRows.map((row) => ({
    sourceElementId: String(row.ELEMENTID),
    fromNode: String(row.FROM_NODE),
    toNode: String(row.TO_NODE),
    bendPtr: Number(row.BEND_PTR),
  })),`);

replaceOnce(
  `  falsificationRule: \`No E\${sourceElementId} constitutive conclusion is admissible unless exact production descendant condensation reproduces solved descendant boundary actions within 1e-3 N/Nm, both source boundaries are unrestrained and fully recoverable from direct neighboring source actions, and zero CAESAR rotations are propagated as +/-0.0001 degree uncertainty rather than replaced.\`,`,
  `  falsificationRule: \`No \${sourceLabel} constitutive conclusion is admissible unless exact production descendant condensation reproduces solved descendant boundary actions within 1e-3 N/Nm, both outer source boundaries are unrestrained and fully recoverable from direct neighboring source actions, and zero CAESAR rotations are propagated as +/-0.0001 degree uncertainty rather than replaced.\`,`,
);
replaceOnce(
  `console.log(\`Issue 947 E\${sourceElementId} bend descendant condensation audit: \${classification}\`);`,
  `console.log(\`Issue 947 \${sourceLabel} bend descendant condensation audit: \${classification}\`);`,
);

replaceOnce(`function boundaryReferenceCustody(pkg, targetRow) {
  const sourceRows = pkg.model.tables.INPUT_BASIC_ELEMENT_DATA.rows;
  const restraintRows = pkg.model.tables.INPUT_RESTRAINTS?.rows ?? [];
  return [String(targetRow.FROM_NODE), String(targetRow.TO_NODE)].map((nodeId) => {
    const other = sourceRows.filter((row) => String(row.ELEMENTID) !== String(targetRow.ELEMENTID)
      && (String(row.FROM_NODE) === nodeId || String(row.TO_NODE) === nodeId));
    const directReferenceActionElementIds = other.filter((row) => hasDirectSourceAction(pkg.references[CASE_ID].rows, row))
      .map((row) => String(row.ELEMENTID));
    const restraintCount = restraintRows.filter((row) => String(row.NODE ?? '') === nodeId).length;
    return {
      nodeId,
      restraintCount,
      otherIncidentSourceElementIds: other.map((row) => String(row.ELEMENTID)),
      directReferenceActionElementIds,
    };
  });
}

function inferredReferenceSourceAction(rows, pkg, targetRow, custody) {
  const sourceRows = pkg.model.tables.INPUT_BASIC_ELEMENT_DATA.rows;
  const ends = custody.map((boundary) => {`, `function boundaryReferenceCustody(pkg, targetElementIds, boundaryNodeIds) {
  const sourceRows = pkg.model.tables.INPUT_BASIC_ELEMENT_DATA.rows;
  const target = new Set(targetElementIds.map(String));
  const restraintRows = pkg.model.tables.INPUT_RESTRAINTS?.rows ?? [];
  return boundaryNodeIds.map((nodeId) => {
    const other = sourceRows.filter((row) => !target.has(String(row.ELEMENTID))
      && (String(row.FROM_NODE) === nodeId || String(row.TO_NODE) === nodeId));
    const directReferenceActionElementIds = other.filter((row) => hasDirectSourceAction(pkg.references[CASE_ID].rows, row))
      .map((row) => String(row.ELEMENTID));
    const restraintCount = restraintRows.filter((row) => String(row.NODE ?? row.NODE_NUM ?? '') === nodeId).length;
    return {
      nodeId,
      restraintCount,
      otherIncidentSourceElementIds: other.map((row) => String(row.ELEMENTID)),
      directReferenceActionElementIds,
    };
  });
}

function inferredReferenceSourceAction(rows, pkg, custody) {
  const ends = custody.map((boundary) => {`);

assert.equal(text.includes('const sourceElementId = String(args[\'source-element\'])'), false);
assert.equal(text.includes('targetRow, custody'), false);
assert.equal(text.includes('--source-elements'), true);
assert.equal(text.includes('sourceElements: sourceRows.map'), true);
fs.writeFileSync(path, text);
console.log(JSON.stringify({
  check: 'lfea-issue947-apply-compound-bend-condensation',
  status: 'PASS',
  path,
  backwardsCompatibleSingleSource: true,
  compoundBoundaryRule: 'OUTER_BOUNDARIES_ONLY_INTERNAL_BEND_JUNCTIONS_SCHUR_CONDENSED',
}, null, 2));

function replaceOnce(before, after) {
  assert.equal(count(text, before), 1, `expected exactly one patch anchor:\n${before.slice(0, 120)}`);
  text = text.replace(before, after);
}

function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}
