import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('src/workspace/linear-piping-support-action-xlsx.js', 'utf8');
assert.match(source, /ENGINEERING_EXPORT_ALLOWED/u);
assert.match(source, /AUDIT ONLY — CONDITIONAL/u);
assert.match(source, /Engineering Loads/u);
assert.match(source, /Audit Actions/u);
assert.match(source, /Sign-off/u);
assert.match(source, /sourceSemanticHash/u);
assert.match(source, /modelVersion/u);
assert.match(source, /executionHash/u);
assert.match(source, /recoverySemanticHash/u);
assert.match(source, /triad\.semanticHash/u);
assert.match(source, /sheetStubs:\s*true/u);
assert.doesNotMatch(source, /fLateral\s*\?\?\s*0|fVertical\s*\?\?\s*0/u);
assert.doesNotMatch(source, /forceLocal/u);
assert.doesNotMatch(source, /linear-fea-solver/u);
console.log('linear-piping-support-action-xlsx-source-guard: PASS');
