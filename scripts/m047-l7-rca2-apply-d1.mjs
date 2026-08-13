#!/usr/bin/env node
import fs from 'node:fs';
import { resolve } from 'node:path';
import { buildCandidateSource } from './lfea-m047-stage2-direction-only-experiment.mjs';
const p=resolve('src/core/fea-benchmarks/caesar-accdb-friction-solve.js');
const original=fs.readFileSync(p,'utf8');
fs.writeFileSync(p,buildCandidateSource(original,p),'utf8');
