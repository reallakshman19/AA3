#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildAccdbDiagnosticPresentation,
  buildInputXmlDiagnosticPresentation,
} from '../src/workspace/lfea-diagnostics/lfea-source-diagnostic-adapters.js';
import { renderLfeaDiagnosticPresentation } from '../src/workspace/lfea-diagnostics/lfea-diagnostic-presentation-view.js';

const preFlight = fixture();
const inputXml = buildInputXmlDiagnosticPresentation(preFlight, {
  sourceIdentityKey: 'SOURCE-A',
  fileName: 'model.xml',
});
const accdb = buildAccdbDiagnosticPresentation(preFlight, {
  sourceIdentityKey: 'SOURCE-B',
  fileName: 'model.accdb',
});

assert.equal(inputXml.findingCount, preFlight.preparation.findings.length);
assert.deepEqual(
  inputXml.rows.map((row) => row.findingId),
  preFlight.preparation.findings.map((row) => row.findingId),
  'Presentation must preserve governed finding order and identity.',
);
assert.deepEqual(
  inputXml.rows.map((row) => row.disposition),
  preFlight.preparation.findings.map((row) => row.disposition),
  'Presentation must preserve governed dispositions verbatim.',
);

const impact = Object.fromEntries(inputXml.rows.map((row) => [row.findingId, [
  row.presentationLevel,
  row.presentationLabel,
]]));
assert.deepEqual(impact.PF_PASS_TEXT_BLOCK, ['info', 'Passed'],
  'Message text containing BLOCK must not make a PASS finding block.');
assert.deepEqual(impact.PF_ADVISORY_FATAL, ['info', 'For information'],
  'Authority severity FATAL must not override an explicit ADVISORY disposition.');
assert.deepEqual(impact.PF_CONDITIONAL, ['warning', 'Review and accept']);
assert.deepEqual(impact.PF_BLOCK, ['error', 'Stops the analysis']);
assert.equal(inputXml.rows.find((row) => row.findingId === 'PF_ADVISORY_FATAL').authoritySeverity, 'FATAL');

assert.deepEqual(
  inputXml.rows.map(({ findingId, disposition, presentationLevel, presentationLabel }) => ({
    findingId, disposition, presentationLevel, presentationLabel,
  })),
  accdb.rows.map(({ findingId, disposition, presentationLevel, presentationLabel }) => ({
    findingId, disposition, presentationLevel, presentationLabel,
  })),
  'Changing only source provenance must not change finding impact.',
);
assert.equal(inputXml.source.kind, 'INPUTXML');
assert.equal(accdb.source.kind, 'ACCDB');

assert.equal(
  inputXml.groups.reduce((total, group) => total + group.count, 0),
  inputXml.findingCount,
  'Every governed finding must survive grouping exactly once.',
);
const sameCodeGroups = inputXml.groups.filter((group) => group.code === 'SAME_CODE');
assert.equal(sameCodeGroups.length, 2,
  'Same-code findings with different governed dispositions must never be merged.');
assert.deepEqual(sameCodeGroups.map((group) => group.disposition), ['CONDITIONAL', 'BLOCK']);

const doc = new FakeDocument();
const root = doc.createElement('div');
const rendered = renderLfeaDiagnosticPresentation(doc, root, inputXml);
assert.equal(rendered.dataset.schema, 'lfea-diagnostic-presentation/v1');
assert.equal(rendered.dataset.findingCount, String(inputXml.findingCount));
const groupItems = collect(root, (node) => node.dataset?.disposition);
assert.ok(groupItems.some((node) => node.dataset.disposition === 'BLOCK'));
assert.ok(groupItems.some((node) => node.dataset.disposition === 'CONDITIONAL'));
assert.ok(groupItems.every((node) => node.dataset.code && node.dataset.category));
assert.ok(groupItems.every((node) => node.dataset.findingIds));

const bad = structuredClone(preFlight);
bad.preparation.findings[0].disposition = 'ERROR';
assert.throws(
  () => buildInputXmlDiagnosticPresentation(bad),
  /Unsupported governed disposition/u,
  'Unknown disposition must fail closed rather than defaulting to info/warning/error.',
);

const badStatus = structuredClone(preFlight);
badStatus.status = 'FAILED';
assert.throws(() => buildAccdbDiagnosticPresentation(badStatus), /Unsupported pre-flight status/u);

const adapterSource = fs.readFileSync(
  'src/workspace/lfea-diagnostics/lfea-diagnostic-presentation.js',
  'utf8',
);
assert.doesNotMatch(adapterSource, /message[^;\n]*match|includes\(['"]BLOCK|includes\(['"]WARN/u,
  'Free-text finding messages must not classify engineering impact.');
assert.doesNotMatch(adapterSource, /capabilityEffects[\s\S]*?BLOCK/u,
  'Capability-effect inspection must not reconstruct final pre-flight disposition.');
assert.doesNotMatch(adapterSource, /PRESENTATION_BY_DISPOSITION\[[^\]]*authoritySeverity/u,
  'Raw severity must not be used to compute presentation impact.');

const inputXmlView = fs.readFileSync(
  'src/workspace/linear-piping-inputxml-diagnostics-view.js',
  'utf8',
);
assert.match(inputXmlView, /buildInputXmlDiagnosticPresentation/u);
assert.match(inputXmlView, /renderLfeaDiagnosticPresentation/u);
assert.doesNotMatch(inputXmlView, /function findingDisposition/u);
assert.doesNotMatch(inputXmlView, /capabilityEffects/u);
assert.doesNotMatch(inputXmlView, /severity === 'ERROR'|severity === 'FATAL'/u,
  'InputXML view must not reconstruct governed disposition from raw topology severity.');

console.log(JSON.stringify({
  check: 'lfea-ui-diagnostic-presentation',
  status: 'PASS',
  governedFindingCount: inputXml.findingCount,
  inputXmlAccdbDispositionParity: true,
  messageInference: false,
  severityInference: false,
  unknownDispositionFailsClosed: true,
}));

function fixture() {
  return {
    status: 'WARN',
    solveAuthorized: false,
    preparation: {
      status: 'WARN',
      semanticHash: 'prep-semantic',
      evidenceHash: 'prep-evidence',
      findings: [
        {
          findingId: 'PF_PASS_TEXT_BLOCK',
          code: 'TEXT_SAYS_BLOCK',
          category: 'SOURCE',
          severity: 'ERROR',
          disposition: 'PASS',
          message: 'The word BLOCK appears here but this governed disposition is PASS.',
          sourceFeatureIds: ['E1'],
        },
        {
          findingId: 'PF_ADVISORY_FATAL',
          code: 'FATAL_BUT_ADVISORY',
          category: 'TOPOLOGY',
          severity: 'FATAL',
          disposition: 'ADVISORY',
          message: 'Raw severity is retained only as authority metadata.',
        },
        {
          findingId: 'PF_CONDITIONAL',
          code: 'SAME_CODE',
          category: 'RESTRAINT',
          severity: 'WARNING',
          disposition: 'CONDITIONAL',
          message: 'Requires explicit review.',
          remediation: 'Review the disclosed simplification.',
        },
        {
          findingId: 'PF_BLOCK',
          code: 'SAME_CODE',
          category: 'RESTRAINT',
          severity: 'ERROR',
          disposition: 'BLOCK',
          message: 'Cannot proceed.',
          remediation: 'Correct the blocking model input.',
        },
      ],
    },
  };
}

function collect(node, predicate, result = []) {
  if (predicate(node)) result.push(node);
  for (const child of node.children ?? []) collect(child, predicate, result);
  return result;
}

class FakeDocument {
  createElement(tagName) {
    return new FakeElement(tagName);
  }
}

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.dataset = {};
    this.textContent = '';
    this.scope = '';
    this.parentNode = null;
  }

  append(...children) {
    for (const child of children) {
      child.parentNode = this;
      this.children.push(child);
    }
  }
}
