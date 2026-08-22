#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(path.join(
  ROOT,
  'src/workspace/lfea-pipeline-analysis-controller.js',
), 'utf8');

assert.doesNotMatch(
  source,
  /authorizeLinearPipingInputXmlPreFlight/u,
  'Run controller must not import or invoke the human pre-flight authorization function.',
);
assert.doesNotMatch(
  source,
  /LFEA_PIPELINE_REVIEWER|Accepted the disclosed conditional limitation set shown at Error check/u,
  'Run controller must not manufacture reviewer identity or acceptance reason.',
);
assert.match(
  source,
  /if \(!preFlight\.solveAuthorized \|\| preFlight\.authorization === null\) \{[\s\S]*?Authorize the current pre-flight at Error check before analyzing\./u,
  'Run controller must fail closed unless Error check already produced a sealed solve authorization.',
);
assert.match(
  source,
  /const authorized = preFlight;/u,
  'Run controller must consume the exact already-authorized pre-flight rather than resealing it.',
);

console.log(JSON.stringify({
  check: 'lfea-ui-analysis-authorization-boundary',
  status: 'PASS',
  authorizationOwnedByRunController: false,
  failClosedOnUnauthorizedPreFlight: true,
}));
