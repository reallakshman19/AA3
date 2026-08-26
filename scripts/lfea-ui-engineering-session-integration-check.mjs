#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mainPath = path.join(ROOT, 'src/main.js');
const source = readFileSync(mainPath, 'utf8');

const syntax = spawnSync(process.execPath, ['--check', mainPath], { encoding: 'utf8' });
assert.equal(syntax.status, 0, `src/main.js syntax check failed:\n${syntax.stderr || syntax.stdout}`);

assert.match(source, /createLfeaEngineeringSession/u);
assert.match(source, /function activeLfeaPreFlight\(\) \{\s*return lfeaSessionPreFlight\(lfeaEngineeringSession\.getState\(\)\);\s*\}/u);
assert.doesNotMatch(
  source,
  /linearPipingInputXmlSource\.getPreFlight\(\)\s*\?\?/u,
  'active LFEA pre-flight must not be selected by InputXML-first controller precedence.',
);
assert.match(
  source,
  /function applyLfeaCaseSelection\(caseIds\)[\s\S]*?LFEA_ENGINEERING_PREPARATION_OWNERS\.INPUTXML[\s\S]*?LFEA_ENGINEERING_PREPARATION_OWNERS\.ACCDB/u,
  'load-case selection must route by explicit preparation owner.',
);
assert.match(source, /lfeaEngineeringSession\.bindAnalysisResult\(state\)/u);
assert.match(source, /invalidateLfeaDownstreamPresentation/u);
assert.match(source, /lfeaAnalysisSurface\?\.analysisController\.clear\(\)/u);
assert.match(source, /lfeaAnalysisSurface\?\.resultsPanel\.setState\(null\)/u);
assert.match(source, /getLfeaEngineeringSessionState\(\) \{ return lfeaEngineeringSession\.getState\(\); \}/u);

assert.match(source, /LFEA_ENGINEERING_SOURCE_KINDS\.STAGED_JSON/u);
assert.match(source, /preparationOwner: LFEA_ENGINEERING_PREPARATION_OWNERS\.INPUTXML/u);
assert.match(source, /derivedInputXmlFileName: result\.outputName/u,
  'StagedJSON provenance must retain the derived InputXML handoff instead of erasing the original source identity.');

assert.match(
  source,
  /snapshot\.fileName !== null && lfeaAccdbInputPanel\.getSnapshot\(\)\.fileName !== null[\s\S]*?lfeaAccdbInputPanel\.clear\(\)/u,
  'activating InputXML-derived source must clear stale ACCDB controller state.',
);
assert.match(
  source,
  /snapshot\.fileName !== null && snapshot\.elementCount !== null[\s\S]*?linearPipingInputXmlSource\.clear\(\)/u,
  'activating ACCDB source must clear stale InputXML-derived controller state.',
);

assert.match(
  source,
  /Optional interface\/B31 code checks currently require an active InputXML-derived source/u,
  'optional code-check assembly must not consume a stale inactive InputXML controller.',
);

console.log(JSON.stringify({
  check: 'lfea-ui-engineering-session-integration',
  status: 'PASS',
  explicitSourceOwnership: true,
  controllerPrecedenceRemoved: true,
  downstreamInvalidationWired: true,
  stagedJsonProvenanceRetained: true,
}));
