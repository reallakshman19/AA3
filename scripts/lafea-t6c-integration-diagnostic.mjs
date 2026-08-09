#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LAFEA_LUG_PINHOLE_EXECUTION_INTAKE_SCHEMA,
  createLafeaLugPinholePhysicalProblemProjection,
  executeLafeaLugPinholePhysicalProblemBatch,
} from '../src/workspace/lafea-controlled-continuum-public.js';
import { createNbT6cFixture } from './lafea-nb-t6c-fixture.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HEAD = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
const fixture = createNbT6cFixture(ROOT, HEAD);
const projection = createLafeaLugPinholePhysicalProblemProjection(fixture.projectionInput);
const benchmark = fixture.benchmark(projection.mappingPackage.semanticHash);
const result = executeLafeaLugPinholePhysicalProblemBatch({
  schema: LAFEA_LUG_PINHOLE_EXECUTION_INTAKE_SCHEMA,
  projection,
  benchmarkQualification: benchmark,
  requestId: 'NB-T6C-INTEGRATION-DIAGNOSTIC',
  recoveryProfileHash: fixture.hash('NB-T6C-INTEGRATION-POINT-RECOVERY'),
  convergenceRequest: {
    quantityId: 'PINHOLE_MAX_RETAINED_VON_MISES',
    units: 'MPa', tolerance: 1e-8, loadCaseId: 'LC1',
    component: 'VON_MISES', reducer: 'MAXIMUM_SIGNED',
  },
});
console.log(JSON.stringify({
  exactHead: HEAD,
  status: result.status,
  accepted: result.accepted,
  diagnostics: result.controllerResult?.diagnostics ?? [],
  levelEvidence: result.controllerResult?.levelResults?.map((row) => ({
    ordinal: row.ordinal,
    status: row.levelEvidence?.status,
    diagnostics: row.levelEvidence?.diagnostics ?? [],
  })) ?? [],
  receiptStatus: result.controllerResult?.receipt?.status ?? null,
  readiness: result.controllerResult?.readiness ?? null,
}, null, 2));
if (result.status !== 'ACCEPTED') process.exitCode = 1;
