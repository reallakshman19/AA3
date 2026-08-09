#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const packagePath = fileURLToPath(new URL(
  '../src/core/fea-benchmarks/caesar-accdb-package.js',
  import.meta.url,
));
const solvePath = fileURLToPath(new URL(
  '../src/core/fea-benchmarks/caesar-accdb-linear-solve.js',
  import.meta.url,
));

patchPackage(packagePath);
patchSolve(solvePath);
console.log(JSON.stringify({
  patch: 'issue-947-smooth90-profile-authority',
  status: 'APPLIED',
  files: [packagePath, solvePath],
}, null, 2));

function patchPackage(path) {
  let content = readFileSync(path, 'utf8');
  const oldField = '    bourdonPressureEffects: normalizeBourdonPressureEffects(value.bourdonPressureEffects),\n';
  const newField = oldField
    + '    b31jSmooth90FlexibilityCorrection: normalizeBooleanAuthority(\n'
    + '      value.b31jSmooth90FlexibilityCorrection,\n'
    + "      'linearSolve.b31jSmooth90FlexibilityCorrection',\n"
    + '    ),\n';
  if (!content.includes('b31jSmooth90FlexibilityCorrection: normalizeBooleanAuthority(')) {
    requireCount(content, oldField, 1, 'linearSolve Bourdon normalization anchor');
    content = content.replace(oldField, newField);
  }

  const functionAnchor = 'function normalizeBourdonPressureEffects(value) {\n';
  const helper = `function normalizeBooleanAuthority(value, field) {\n  if (!value || typeof value !== 'object' || Array.isArray(value)) {\n    throw new TypeError(\`${'${field}'} must be an object.\`);\n  }\n  return deepFreeze({\n    enabled: requiredBoolean(value.enabled, \`${'${field}'}.enabled\`),\n    source: nonempty(value.source, \`${'${field}'}.source\`),\n  });\n}\n\n`;
  if (!content.includes('function normalizeBooleanAuthority(value, field) {')) {
    requireCount(content, functionAnchor, 1, 'Bourdon normalizer function anchor');
    content = content.replace(functionAnchor, helper + functionAnchor);
  }

  requireCount(content, 'b31jSmooth90FlexibilityCorrection: normalizeBooleanAuthority(', 1, 'smooth-90 normalized field');
  requireCount(content, 'function normalizeBooleanAuthority(value, field) {', 1, 'boolean authority normalizer');
  writeFileSync(path, content, 'utf8');
}

function patchSolve(path) {
  let content = readFileSync(path, 'utf8');
  const oldBinding = '        smooth90FlexibilityCorrection: false,\n';
  const newBinding = '        smooth90FlexibilityCorrection: input.solveProfile.b31jSmooth90FlexibilityCorrection.enabled,\n';
  if (!content.includes(newBinding)) {
    requireCount(content, oldBinding, 1, 'hard-coded smooth-90 bend binding');
    content = content.replace(oldBinding, newBinding);
  }
  requireCount(content, newBinding, 1, 'profile-owned smooth-90 bend binding');
  if (content.includes(oldBinding)) throw new Error('Legacy hard-coded smooth90FlexibilityCorrection=false remains.');
  writeFileSync(path, content, 'utf8');
}

function requireCount(content, needle, expected, label) {
  const actual = content.split(needle).length - 1;
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, found ${actual}.`);
}
