#!/usr/bin/env node
/** Authentic source-only context for repeated BM4_L 221xx RX deviations. */
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import MDBReader from 'mdb-reader';

const EXPECTED_SHA = '64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8';
const TARGETS = Object.freeze(['22100','22110','22115','22120','22125','22130','22140']);
const id = (v) => String(v ?? '').trim();

export function traceRxSourceTopology(tables) {
  const elements = tables.INPUT_BASIC_ELEMENT_DATA.map((raw) => ({
    id: id(raw.ELEMENTID), from: id(raw.FROM_NODE), to: id(raw.TO_NODE),
    bendPointer: Number(raw.BEND_PTR ?? 0),
    rigidPointer: Number(raw.RIGID_PTR ?? 0),
    reducerPointer: Number(raw.REDUCER_PTR ?? 0),
    teePointer: Number(raw.SIFTEE_PTR ?? 0),
    sourceRow: raw,
  }));
  assert.ok(elements.length > 0 && elements.every((e) => e.id && e.from && e.to),
    'BM4L_RX_SOURCE_ELEMENT_IDENTITIES_REQUIRED');
  const atTarget = new Set(TARGETS);
  const direct = elements.filter((e) => atTarget.has(e.from) || atTarget.has(e.to));
  assert.ok(direct.length > 0, 'BM4L_RX_SOURCE_NEIGHBORHOOD_EMPTY');
  const adjacentNodeIds = new Set([...atTarget,...direct.flatMap((e) => [e.from,e.to])]);
  const neighborhood = elements.filter((e) =>
    adjacentNodeIds.has(e.from) || adjacentNodeIds.has(e.to));
  const findNodeRow = (rows, nodeId) => rows.filter((row) =>
    Object.entries(row).some(([key,value]) => /NODE|POINT/u.test(key) && id(value) === nodeId));
  const nodes = TARGETS.map((nodeId) => {
    const incident = elements.filter((e) => e.from === nodeId || e.to === nodeId);
    return {
      nodeId,
      sourceElementIds: incident.map((e) => e.id),
      neighborIds: [...new Set(incident.map((e) => e.from === nodeId ? e.to : e.from))].sort(),
      sourceCoordinateRows: findNodeRow(tables.INPUT_NODAL_COORDINATES,nodeId),
      sourceRestraintRows: findNodeRow(tables.INPUT_RESTRAINTS,nodeId),
    };
  });
  return {
    schema:'lfea-bm4l-rx-source-topology-forensic/v1',
    status:'SOURCE_GRAPH_ONLY_NUMERICAL_QUALIFICATION_NOT_CLAIMED',
    benchmarkId:'BM4_L', sourceElementCount:elements.length,
    sourceCoordinateCount:tables.INPUT_NODAL_COORDINATES.length,
    targetNodes:TARGETS, directElementCount:direct.length,
    neighborhoodElementCount:neighborhood.length,
    missingTargetNodeIds:nodes.filter((n)=>n.sourceElementIds.length===0).map((n)=>n.nodeId),
    nodes, directSourceElements:direct, neighborhoodSourceElements:neighborhood,
    engineeringFactorsModified:false, numericalParityClaimed:false,
  };
}
function main(argv) {
  const args=new Map();
  for(let i=0;i<argv.length;i+=2) {
    assert.ok(['--accdb','--out'].includes(argv[i])&&argv[i+1], 'Expected --accdb <path> --out <path>');
    args.set(argv[i],argv[i+1]);
  }
  const data=readFileSync(resolve(args.get('--accdb')));
  assert.equal(data.length,5136384,'BM4L_RX_SOURCE_BYTE_LENGTH_MISMATCH');
  const sha=createHash('sha256').update(data).digest('hex');
  assert.equal(sha,EXPECTED_SHA,'BM4L_RX_SOURCE_SHA_MISMATCH');
  const reader=new MDBReader(data);
  const names=['INPUT_BASIC_ELEMENT_DATA','INPUT_NODAL_COORDINATES','INPUT_RESTRAINTS'];
  const tables=Object.fromEntries(names.map((name)=>[name,reader.getTable(name).getData()]));
  const trace={...traceRxSourceTopology(tables),sourceAccdbSha256:sha};
  const dest=resolve(args.get('--out'));
  mkdirSync(dirname(dest),{recursive:true});
  writeFileSync(dest,JSON.stringify(trace,null,2)+'\n','utf8');
  console.log('BM4L_RX_SOURCE_TOPOLOGY '+JSON.stringify({
    status:trace.status,directElementCount:trace.directElementCount,
    missingTargetNodeIds:trace.missingTargetNodeIds,
    nodes:trace.nodes.map((n)=>({node:n.nodeId,elementIds:n.sourceElementIds,
      neighbors:n.neighborIds,restraints:n.sourceRestraintRows.length})),
    elements:trace.directSourceElements.map((e)=>({
      id:e.id,from:e.from,to:e.to,bendPtr:e.bendPointer,
      rigidPtr:e.rigidPointer,reducerPtr:e.reducerPointer,teePtr:e.teePointer})),
  }));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) main(process.argv.slice(2));
