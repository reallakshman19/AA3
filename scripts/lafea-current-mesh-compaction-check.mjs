#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  compactLafeaCurrentGenerationWorkspace,
  compactLafeaRefinementWorkspace,
  currentGenerationCompactionRequired,
  generationDisclosureSummary,
} from '../src/workspace/lafea-refinement-disclosure.js';
import { FakeDocument } from './lafea-u4g-fixtures.mjs';

const pass = model('MESH_CURRENT_PASS', 'CURRENT_PASS');
const warning = model('MESH_CURRENT_WARNING', 'CURRENT_WARNING');
const block = model('MESH_CURRENT_BLOCK', 'CURRENT_BLOCK');
const stale = model('MESH_STALE', 'STALE');
const notReady = { ...model('READY_TO_PLAN', 'ABSENT'), evidence: { present: false } };

assert.equal(currentGenerationCompactionRequired(pass), true);
assert.equal(currentGenerationCompactionRequired(warning), true);
assert.equal(currentGenerationCompactionRequired(block), false);
assert.equal(currentGenerationCompactionRequired(stale), false);
assert.equal(currentGenerationCompactionRequired(notReady), false);
assert.equal(generationDisclosureSummary(pass), 'Change mesh');
assert.equal(generationDisclosureSummary({
  ...pass,
  generation: { ...pass.generation, generationMode: 'SOURCE_MESH_ADOPTION' },
}), 'Change source-mesh adoption');

const doc = new FakeDocument();
const host = doc.createElement('div');
const generation = doc.createElement('section');
generation.dataset.discretizationSection = 'generation';
const preview = doc.createElement('button');
preview.dataset.role = 'lafea-generation-plan';
preview.textContent = 'Preview mesh plan';
const generate = doc.createElement('button');
generate.dataset.role = 'lafea-generation-generate';
generate.textContent = 'Generate and retain mesh';
generation.append(preview, generate);
const refinement = doc.createElement('fieldset');
refinement.dataset.role = 'lafea-retained-mesh-refinement';
host.append(generation, refinement);

compactLafeaRefinementWorkspace(host, pass);
const generationDisclosure = host.querySelector('[data-role="lafea-generation-disclosure"]');
assert.ok(generationDisclosure, 'current retained mesh must compact generation controls');
assert.equal(
  generationDisclosure.querySelector('[data-role="lafea-generation-disclosure-summary"]')?.textContent,
  'Change mesh',
);
assert.ok(generationDisclosure.querySelector('[data-role="lafea-generation-plan"]'));
assert.ok(generationDisclosure.querySelector('[data-role="lafea-generation-generate"]'));
assert.ok(host.querySelector('[data-role="lafea-refinement-disclosure"]'));

const blockedHost = new FakeDocument().createElement('div');
const blockedGeneration = blockedHost.ownerDocument.createElement('section');
blockedGeneration.dataset.discretizationSection = 'generation';
blockedHost.append(blockedGeneration);
assert.equal(compactLafeaCurrentGenerationWorkspace(blockedHost, block), null);
assert.equal(blockedHost.querySelector('[data-role="lafea-generation-disclosure"]'), null);
assert.ok(blockedHost.querySelector('[data-discretization-section="generation"]'));

const renderer = fs.readFileSync(
  new URL('../src/workspace/lafea-discretization-generation-panel.js', import.meta.url),
  'utf8',
);
assert.match(renderer, /Preview mesh plan/u);
assert.match(renderer, /Generate and retain mesh/u);
assert.match(renderer, /planSummary\(doc, generation\.plan\)/u);
assert.match(renderer, /onPlanMesh/u);
assert.match(renderer, /onGenerateMesh/u);

console.log(JSON.stringify({
  check: 'lafea-current-mesh-compaction',
  status: 'PASS',
  currentPassCompacted: true,
  currentWarningCompacted: true,
  blockedRecoveryExpanded: true,
  staleRecoveryExpanded: true,
  canonicalGenerationControlsRetained: true,
}, null, 2));

function model(uiPhase, state) {
  return {
    uiPhase,
    state,
    evidence: { present: true },
    generation: { generationMode: 'AUTOMATIC_MESH' },
    actions: { canRefineMesh: false },
    refinement: { scopeEligible: false, productQualified: false },
  };
}
