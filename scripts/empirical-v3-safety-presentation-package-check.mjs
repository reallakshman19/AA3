import assert from 'node:assert/strict';
import {
  EMPIRICAL_V3_BRANCH_AUTHORITY_SCHEMA,
  ENGINEERING_RISK_SET_SCHEMA,
  projectEmpiricalV3Workflow,
  sealEmpiricalV3BranchAuthority,
  bindComponentToBranch,
  sealEngineeringRiskSet,
  sealEmpiricalV3SafetyPresentationPackage,
  requireEmpiricalV3SafetyPresentationPackage,
  requireEmpiricalV3WorkflowProjection,
} from '../src/core/empirical-v3-safety/index.js';

const processRecord = Object.freeze({
  schema:'empirical-v3-branch-common-basis/v1',kind:'PROCESS',
  fieldStates:Object.freeze({operatingTemperature:Object.freeze({status:'DECLARED',value:180,unit:'degC',required:true})}),
  ref:'process-basis:fixture',semanticHash:'fnv1a64:1111111111111111',
});
const branch=sealEmpiricalV3BranchAuthority({schema:EMPIRICAL_V3_BRANCH_AUTHORITY_SCHEMA,runId:'RUN-UI-1',
  topologyRef:{ref:'topology:T1',semanticHash:'fnv1a64:2222222222222222',authority:'EXACT',toleranceInferred:false},
  branchTopologyRef:{ref:'branch-topology:B1',semanticHash:'fnv1a64:3333333333333333'},componentIds:['P101'],
  commonAuthorityRefs:[{kind:'PROCESS',ref:processRecord.ref,semanticHash:processRecord.semanticHash}],sourceEvidenceRefs:[],riskRefs:[]});
const component=bindComponentToBranch({componentId:'P101',componentType:'PIPE',topologyComponentRef:{ref:'route-component:P101',semanticHash:'fnv1a64:4444444444444444'},localAuthorityRefs:[{kind:'WT',ref:'Q:P101:WT',semanticHash:'fnv1a64:5555555555555555'}],sourceEvidenceRefs:[],riskRefs:[]},branch);
const riskSet=sealEngineeringRiskSet({runId:'RUN-UI-1',risks:[]});
assert.equal(riskSet.schema,ENGINEERING_RISK_SET_SCHEMA);
const workflow=projectEmpiricalV3Workflow({
  source:{bound:true,current:true,semanticHash:'fnv1a64:6666666666666666'},
  authorities:{built:true,current:true,semanticHash:'fnv1a64:7777777777777777'},
  branches:{built:true,current:true,reviewCurrent:true,semanticHash:branch.semanticHash,reviewSemanticHash:branch.reviewBasisHash},
  riskSet:{evaluated:true,current:true,semanticHash:riskSet.semanticHash,highBlockCount:0,highConfirmPendingCount:0},
  calculationAuthorization:{present:false,current:false},
  calculationResult:{present:false,current:false,reviewRequired:true},resultReview:{present:false,current:false},audit:{ready:false,current:false},
});
assert.equal(workflow.state,'SAFETY_CLEARED');
assert.equal(requireEmpiricalV3WorkflowProjection(workflow).semanticHash,workflow.semanticHash);
const input={runId:'RUN-UI-1',workflow,branches:[branch],components:[component],riskSet,confirmations:[],calculationAuthorization:null,
  records:[{ref:processRecord.ref,kind:'PROCESS',semanticHash:processRecord.semanticHash,record:processRecord}]};
const packageA=sealEmpiricalV3SafetyPresentationPackage(input);
const packageB=sealEmpiricalV3SafetyPresentationPackage({...input,records:[...input.records].reverse()});
assert.equal(packageA.semanticHash,packageB.semanticHash,'presentation ordering must not alter semantic identity');
assert.equal(packageA.workflow.state,'SAFETY_CLEARED');
assert.equal(packageA.branches[0].semanticHash,branch.semanticHash);
assert.equal(packageA.riskSet.semanticHash,riskSet.semanticHash);
assert.equal(requireEmpiricalV3SafetyPresentationPackage(packageA).semanticHash,packageA.semanticHash);

const fabricatedWorkflow={...workflow,state:'AUDIT_EXPORT_READY',canRunCalculation:false,calculationAuthorizationRef:null};
assert.throws(()=>requireEmpiricalV3WorkflowProjection(fabricatedWorkflow),/identity\/state mismatch/);
assert.throws(()=>sealEmpiricalV3SafetyPresentationPackage({...input,workflow:fabricatedWorkflow}),/workflow projection identity\/state mismatch/i,
  'presentation package cannot trust a fabricated post-run workflow state');

console.log('PASS empirical v3 safety presentation package / workflow authenticity');
