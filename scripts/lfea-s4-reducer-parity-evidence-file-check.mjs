#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { validateS4ReducerParityEvidence } from './lfea-s4-reducer-parity-evidence-contract.mjs';

const input = process.argv[2];
if (input === '--help' || input === '-h') {
  console.log('Usage: node scripts/lfea-s4-reducer-parity-evidence-file-check.mjs <evidence.json>');
  process.exit(0);
}
if (typeof input !== 'string' || input.trim() === '') {
  console.error('S4 reducer parity evidence path is required.');
  process.exit(2);
}

const evidencePath = path.resolve(process.cwd(), input);
let evidence;
try {
  evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
} catch (error) {
  console.error(JSON.stringify({
    status: 'INVALID_EVIDENCE_FILE',
    evidencePath,
    error: String(error?.message ?? error),
  }));
  process.exit(2);
}

try {
  const result = validateS4ReducerParityEvidence(evidence);
  console.log(JSON.stringify({
    ...result,
    evidencePath,
  }));
} catch (error) {
  console.error(JSON.stringify({
    status: 'REJECTED_PARITY_EVIDENCE',
    evidencePath,
    code: String(error?.code ?? 'S4_REDUCER_EVIDENCE_REJECTED'),
    evidence: error?.evidence ?? null,
  }));
  process.exit(1);
}
