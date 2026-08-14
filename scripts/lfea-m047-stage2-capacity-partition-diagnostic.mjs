#!/usr/bin/env node
/** M047 Stage 2 R3 data-only capacity-partition diagnostic. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalPrettyStringify, semanticHash } from '../src/core/shared-piping-model/canonical-json.js';

function buildCapacityPartitionDiagnostic(iteration) {
  if (iteration.caseId !== 'L13' || !iteration.converged || !Array.isArray(iteration.restraints)) {
    throw new TypeError('R3 requires a converged L13 tuning iteration.');
  }
  const rows = iteration.restraints.map((r) => {
    const force = r.tangential.referenceN.map(Number);
    const cap = Number(r.capacity.referenceN);
    const resultant = Math.hypot(...force);
    const maximumAxis = Math.max(...force.map((v) => Math.abs(v)));
    const resultantUtilisation = cap > 0 ? resultant / cap : null;
    const maximumAxisUtilisation = cap > 0 ? maximumAxis / cap : null;
    return {
      restraintId: r.restraintId,
      nodeId: String(r.nodeId),
      frictionDofs: r.frictionDofs,
      referenceForceN: force,
      referenceCapacityN: cap,
      resultantUtilisation,
      maximumAxisUtilisation,
      multiAxis: force.length > 1,
      resultantOverCap: resultantUtilisation !== null && resultantUtilisation > 1,
      everyAxisWithinCap: maximumAxisUtilisation !== null && maximumAxisUtilisation <= 1,
      perAxisBoxCanExplainResultantOverCap: force.length > 1
        && resultantUtilisation > 1 && maximumAxisUtilisation <= 1,
      oneAxisOverCap: force.length === 1 && resultantUtilisation > 1,
      materiallyOverCap2Percent: resultantUtilisation !== null && resultantUtilisation > 1.02,
      d1VectorRelativeError: r.tangential.vectorRelativeError,
    };
  });
  const record = {
    schema: 'm047-bm4l-stage2-capacity-partition-diagnostic/v1',
    sourceAccdbSha256: iteration.sourceAccdbSha256,
    iterationSemanticHash: iteration.iterationSemanticHash ?? null,
    rule: 'DATA_ONLY_COMPARE_REFERENCE_RESULTANT_COULOMB_CIRCLE_VERSUS_PER_TANGENTIAL_AXIS_BOX',
    interpretationBoundary: 'This diagnostic changes no solver mechanic. A per-axis solve is justified only where the reference resultant exceeds mu|N| while every component remains within mu|N|.',
    summary: {
      restraintCount: rows.length,
      multiAxisCount: rows.filter((r) => r.multiAxis).length,
      perAxisBoxCandidateIds: rows.filter((r) => r.perAxisBoxCanExplainResultantOverCap).map((r) => r.restraintId),
      oneAxisOverCapIds: rows.filter((r) => r.oneAxisOverCap).map((r) => r.restraintId),
      materiallyOverCap2PercentIds: rows.filter((r) => r.materiallyOverCap2Percent).map((r) => r.restraintId),
      target22140PartitionRelevant: rows.find((r) => r.nodeId === '22140')?.perAxisBoxCanExplainResultantOverCap ?? null,
      target22220PartitionRelevant: rows.find((r) => r.nodeId === '22220')?.perAxisBoxCanExplainResultantOverCap ?? null,
      target20710OneAxisOverCap: rows.find((r) => r.nodeId === '20710')?.oneAxisOverCap ?? null,
    },
    rows,
  };
  return { ...record, diagnosticSemanticHash: semanticHash(record) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args=new Map(); for(let i=2;i<process.argv.length;i+=2) args.set(process.argv[i],process.argv[i+1]);
  const iterationPath=args.get('--iteration'); if(!iterationPath) throw new TypeError('Usage: --iteration <L13.json> [--out <json>]');
  const record=buildCapacityPartitionDiagnostic(JSON.parse(readFileSync(resolve(iterationPath),'utf8')));
  const out=args.get('--out'); if(out){const p=resolve(out);mkdirSync(dirname(p),{recursive:true});writeFileSync(p,`${canonicalPrettyStringify(record)}\n`,'utf8');}
  process.stdout.write(`${canonicalPrettyStringify(record.summary)}\n`);
}
export { buildCapacityPartitionDiagnostic };
