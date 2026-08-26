#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  PROTECTED_LAFEA3_LIMITATION, PROTECTED_LAFEA3_LIMITATIONS,
  PROTECTED_LAFEA4_LIMITATION, PROTECTED_LAFEA4_LIMITATIONS,
  evaluateLafea1371RegistryClosureReadiness,
} from './lib/lafea1371-registry-closure-readiness.mjs';
import { evaluateLafea1371RegistryCleanupProposal } from './lib/lafea1371-registry-cleanup-proposal-guard.mjs';

const HEAD='a'.repeat(40); const registry=validRegistry(); const baselineSource=validRegistrySource();
const readiness=evaluateLafea1371RegistryClosureReadiness({
  repositoryHead:HEAD, implementationAuthorizationVerification:validVerification(),
  lafea3RegistryEntry:registry.find((e)=>e.stageId==='LAFEA.3'),
  lafea4RegistryEntry:registry.find((e)=>e.stageId==='LAFEA.4'), stageRegistry:registry,
  stageRegistrySource:baselineSource,
});
const candidate=preparedCandidate(); const candidateSource=preparedCandidateSource();
const positive=evaluateLafea1371RegistryCleanupProposal({ readiness, candidateRegistry:candidate,
  changedPaths:['src/workspace/lafea-stage-registry.js','agents/PR9999_workreport.md'],
  qualifiedRegistrySource:baselineSource, candidateRegistrySource:candidateSource });
assert.equal(positive.status,'PASS');
assert.equal(positive.disposition,'STRUCTURALLY_ADMISSIBLE_FOR_HUMAN_WORDING_REVIEW');
assert.equal(positive.wordingApproved,false); assert.equal(positive.mergeAuthorityGranted,false);
assert.match(positive.candidateRegistrySourceHash,/^sha256:[0-9a-f]{64}$/u);

expectFailure('qualified baseline bytes differ from receipt',(f)=>{f.qualifiedRegistrySource += '\n// drift\n';},/qualified registry source bytes/u);
expectFailure('hidden helper code changed',(f)=>{f.candidateRegistrySource=f.candidateRegistrySource.replace('return true','return false');},/changes source bytes outside/u);
expectFailure('comment added',(f)=>{f.candidateRegistrySource += '\n// hidden change\n';},/changes source bytes outside/u);
expectFailure('whitespace outside wording changed',(f)=>{f.candidateRegistrySource=f.candidateRegistrySource.replace('function helper()', 'function  helper()');},/changes source bytes outside/u);
expectFailure('no wording change',(f)=>{f.candidateRegistry=structuredClone(registry); f.candidateRegistrySource=baselineSource;},/did not replace the obsolete top-level limitation/u);
expectFailure('integration point statement changed',(f)=>{f.candidateRegistry.find((e)=>e.stageId==='LAFEA.3').limitations[0]='Nodal stress governs.';},/integration-point stress authority/u);
expectFailure('authority widened',(f)=>{f.candidateRegistry.find((e)=>e.stageId==='LAFEA.3').authority='NONLINEAR_CONTINUUM';},/must not widen continuum authority/u);
expectFailure('other stage changed',(f)=>{f.candidateRegistry.find((e)=>e.stageId==='LAFEA.2').purpose='changed';},/changes semantics outside/u);
expectFailure('extra production path',(f)=>{f.changedPaths.push('src/core/local-continuum/solver.js');},/may mutate only/u);

process.stdout.write(`${JSON.stringify({schema:'lafea1371-registry-cleanup-proposal-guard-self-test/v2',status:'PASS',checks:{
  onlyTwoLafea3WordingLiteralsStructurallyAdmissible:true, qualifiedBaselineSourceBoundToReadiness:true,
  hiddenHelperCodeMutationRejected:true, commentMutationRejected:true, whitespaceMutationRejected:true,
  unchangedObsoleteWordingRejected:true, integrationPointAuthorityMutationRejected:true,
  continuumAuthorityWideningRejected:true, otherStageMutationRejected:true, extraProductionPathRejected:true,
  wordingStillRequiresHumanReview:true},engineeringMechanicsExecuted:false,wordingApproved:false,
  mergeAuthorityGranted:false,releaseAuthorityGranted:false},null,2)}\n`);

function expectFailure(label,mutate,pattern){const f={readiness,candidateRegistry:preparedCandidate(),changedPaths:['src/workspace/lafea-stage-registry.js'],qualifiedRegistrySource:baselineSource,candidateRegistrySource:preparedCandidateSource()}; mutate(f); assert.throws(()=>evaluateLafea1371RegistryCleanupProposal(f),pattern,label);}
function preparedCandidate(){const r=structuredClone(registry);const row=r.find((e)=>e.stageId==='LAFEA.3');row.limitation='Qualified retained-mesh orchestration is available within the registered continuum authority.';row.limitations[1]='Model-to-mesh-to-analysis orchestration remains limited to the registered qualified continuum route.';return r;}
function preparedCandidateSource(){return baselineSource.replace(PROTECTED_LAFEA3_LIMITATION,'Qualified retained-mesh orchestration is available within the registered continuum authority.').replace(PROTECTED_LAFEA3_LIMITATIONS[1],'Model-to-mesh-to-analysis orchestration remains limited to the registered qualified continuum route.');}
function validVerification(){return{schema:'lafea-implementation-authorization-local-verification/v1',status:'PASS',repository:'reallaksh19/Advanced_Analysis',repositoryHead:HEAD,evidenceArtifactHash:`sha256:${'b'.repeat(64)}`,q1ToQ5:{q1:'PASS',q2:'PASS',q3:'PASS',q4:'PASS',q5:'PASS'},q1DirectLoadedElementEvidence:'PASS',q3IndependentPressureEvidence:'PASS',retainedFileMatchesDelegatedEnvelope:true,checkoutCleanAfterReceiptWrite:true,implementationAuthorizationEvidenceVerified:true,localHarnessAuthorityCreated:false,releaseAuthorityGranted:false};}
function validRegistry(){return[genericStage('LAFEA.1'),genericStage('LAFEA.2'),validLafea3(),validLafea4(),genericStage('LAFEA.5'),genericStage('LAFEA.6')];}
function genericStage(stageId){return{schema:'lafea-stage-registry/v2',stageId,label:stageId,purpose:`${stageId} purpose`,limitation:`${stageId} limitation`,category:'GENERIC',authority:`${stageId}_AUTH`,engineState:'QUALIFIED_ROUTE_REGISTERED',enginePackage:null,inputContractRole:`${stageId}_INPUT`,resultContractRole:null,presenterRole:null,unitSourceRole:null,previewPolicy:'NO_GEOMETRY_AUTHORITY',previewSource:{nodePath:null,elementPath:null,editable:false},collectionPaths:[],limitations:[`${stageId} limitation detail`]};}
function validLafea3(){return{schema:'lafea-stage-registry/v2',stageId:'LAFEA.3',label:'2D continuum',purpose:'T6/Q8 continuum with T3 fallback and benchmark support',category:'CONTINUUM_2D',engineState:'QUALIFIED_ROUTE_REGISTERED',authority:'T3_T6_Q8_LINEAR_CONTINUUM',enginePackage:'local-continuum',inputContractRole:'LOCAL_CONTINUUM_MODEL',resultContractRole:'LOCAL_CONTINUUM_RESULT',presenterRole:'CONTINUUM_RESULT_EVIDENCE',unitSourceRole:'DOCUMENT_UNITS',previewPolicy:'SOURCE_MESH_EDITABLE',previewSource:{nodePath:'nodes',elementPath:'elements',editable:true},collectionPaths:['materials','nodes','elements','constraints','loadCases'],limitation:PROTECTED_LAFEA3_LIMITATION,limitations:[...PROTECTED_LAFEA3_LIMITATIONS]};}
function validLafea4(){return{schema:'lafea-stage-registry/v2',stageId:'LAFEA.4',label:'Thin shell',purpose:'Legacy five-DOF triangular CST+DKT thin-shell path',category:'THIN_SHELL',engineState:'QUALIFIED_ROUTE_REGISTERED',authority:'CST_DKT_TRI3_THIN_SHELL_V1',enginePackage:'local-shell',inputContractRole:'LOCAL_SHELL_MODEL',resultContractRole:'LOCAL_SHELL_RESULT',presenterRole:'SHELL_RESULT_EVIDENCE',unitSourceRole:'DOCUMENT_UNITS',previewPolicy:'SOURCE_MESH_EDITABLE',previewSource:{nodePath:'nodes',elementPath:'elements',editable:true},collectionPaths:['materials','nodes','elements','constraints','loadCases'],limitation:PROTECTED_LAFEA4_LIMITATION,limitations:[...PROTECTED_LAFEA4_LIMITATIONS]};}
function validRegistrySource(){return `export const LAFEA_STAGE_REGISTRY = Object.freeze([\n  entry({\n    stageId: 'LAFEA.3',\n    label: '2D continuum',\n    limitation: '${PROTECTED_LAFEA3_LIMITATION}',\n    limitations: [\n      '${PROTECTED_LAFEA3_LIMITATIONS[0]}',\n      '${PROTECTED_LAFEA3_LIMITATIONS[1]}',\n    ],\n  }),\n  entry({\n    stageId: 'LAFEA.4',\n    label: 'Thin shell',\n  }),\n]);\nfunction helper() { return true; }\n`;}
