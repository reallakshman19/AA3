import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { qualifyHexagonIndependentPrecheck } from './emp1-independent-precheck-qualification-lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const defaultPath = path.join(
  repoRoot,
  'validation/emp1/caux2017-wrc01f/hexagon-wrc107-independent-precheck-v1.json'
);
const target = process.argv[2] ? path.resolve(process.argv[2]) : defaultPath;

const precheck = JSON.parse(fs.readFileSync(target, 'utf8'));
const result = qualifyHexagonIndependentPrecheck(precheck);
console.log(JSON.stringify({ target, ...result }, null, 2));
process.exitCode = result.status === 'PASS_BOUNDED_PRECHECK_QUALIFICATION' ? 0 : 1;
