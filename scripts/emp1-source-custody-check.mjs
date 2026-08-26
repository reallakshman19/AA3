import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  aggregateCustodyStatus,
  inspectEmp1SourceFile,
} from './emp1-source-custody-lib.mjs';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const sourceRoot = readArg('--source-root');
if (!sourceRoot) {
  console.error('Usage: node scripts/emp1-source-custody-check.mjs --source-root <directory-containing-exact-pinned-pdfs>');
  process.exit(2);
}

const ledgerPaths = [
  'validation/emp1/wrc537-2013/source-ledger.json',
  'validation/emp1/caux2017-wrc01f/source-ledger.json',
];

const results = [];
for (const relativeLedgerPath of ledgerPaths) {
  const ledger = JSON.parse(await readFile(resolve(repoRoot, relativeLedgerPath), 'utf8'));
  const filePath = resolve(sourceRoot, ledger.fileName);
  results.push(await inspectEmp1SourceFile({ ledger, filePath }));
}

const status = aggregateCustodyStatus(results);
console.log(JSON.stringify({ schema: 'emp1-source-custody-check/v1', status, results }, null, 2));

if (status === 'PASS') process.exit(0);
if (status === 'BLOCKED') process.exit(2);
process.exit(1);

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || index + 1 >= process.argv.length) return null;
  return process.argv[index + 1];
}
