import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('src/workspace/linear-piping-support-actions-publication.js', 'utf8');

assert.match(source, /projectSupportActionTriad/u);
assert.match(source, /result\.forceGlobal/u);
assert.match(source, /definition\.basis\.e1/u);
assert.match(source, /supportBinding\?\.supportKey \?\? definition\.sourceEntityId/u);
assert.match(source, /upGlobal: input\.upGlobal/u);
assert.match(source, /reportingSignConvention: result\.reportingSignConvention/u);
assert.match(source, /LFEA_SUPPORT_ACTIONS_INTERFACE_SET_STALE/u);
assert.match(source, /LFEA_SUPPORT_ACTIONS_ENTITY_AMBIGUOUS/u);
assert.doesNotMatch(source, /\bforceLocal\b/u);
assert.doesNotMatch(source, /EventBus|event-bus\.js|event-topics\.js/u);
assert.doesNotMatch(source, /upGlobal\s*=|upGlobal\s*:\s*\{\s*x\s*:\s*0\s*,\s*y\s*:\s*0\s*,\s*z\s*:\s*1/u);
assert.doesNotMatch(source, /fLateral\s*\?\?\s*0|fVertical\s*\?\?\s*0/u);

console.log('linear-piping-support-actions-publication-source-guard: PASS');
