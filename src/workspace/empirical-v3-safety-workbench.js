import {
  createEngineeringConfirmationReceipt,
  requireEmpiricalV3CoupledCalculationEvidence,
  requireEmpiricalV3SafetyPresentationPackage,
} from '../core/empirical-v3-safety/index.js';
import { EventBus } from './event-bus.js';
import { EVENT_TOPICS } from './event-topics.js';
import { renderEmpiricalV3BranchBasis } from './empirical-v3-branch-basis-view.js';
import { renderEmpiricalV3EvidenceInspector } from './empirical-v3-evidence-view.js';
import { EMPIRICAL_V3_EXPLAIN_MODES, renderEmpiricalV3ExplainCalculation } from './empirical-v3-explain-calculation-view.js';
import { renderEmpiricalV3ResultReview } from './empirical-v3-result-review-view.js';
import { EmpiricalV3ReviewAuditController } from './empirical-v3-review-audit-controller.js';
import { focusEmpiricalV3Risk, renderEmpiricalV3SafetyGate } from './empirical-v3-safety-gate-view.js';
import { createEmpiricalV3SafetyWorkbenchSection } from './empirical-v3-safety-workbench-dom.js';

export function mountEmpiricalV3SafetyWorkbench(applicationRoot, options = {}) {
  if (!applicationRoot || typeof applicationRoot.querySelector !== 'function') throw new TypeError('Empirical V3 safety workbench requires the application root.');
  const panel = applicationRoot.querySelector('[data-panel="properties"] .panel-collapsible-content');
  if (!panel) throw new TypeError('Empirical V3 safety workbench mount root is missing.');
  return new EmpiricalV3SafetyWorkbenchController(panel, options.documentRef ?? applicationRoot.ownerDocument, options).init();
}

export class EmpiricalV3SafetyWorkbenchController {
  constructor(panelContainer, documentRef, options = {}) {
    this.panelContainer=panelContainer;this.documentRef=documentRef;this.options=options;
    this.urlApi=options.urlApi??documentRef.defaultView?.URL??globalThis.URL;this.packageValue=null;this.calculationEvidence=null;
    this.activeTab='BRANCH_BASIS';this.explainMode='SUMMARY';this.lastConfirmationReceipt=null;this.message='No sealed Empirical V3 safety package is loaded.';this.error='';this.elements=null;
    this.reviewAudit=new EmpiricalV3ReviewAuditController({
      onResultReviewCreated:(receipt)=>this.options.onResultReviewCreated?.(receipt,this.packageValue,this.calculationEvidence)??null,
      onAuditReadinessCreated:(readiness,resultReview)=>this.options.onAuditReadinessCreated?.(readiness,resultReview,this.packageValue,this.calculationEvidence)??null,
    });
  }

  init(){if(this.elements)return this;this.elements=createEmpiricalV3SafetyWorkbenchSection(this.documentRef);this.panelContainer.append(this.elements.section);this.elements.branchTab.addEventListener('click',()=>this.setTab('BRANCH_BASIS'));this.elements.safetyTab.addEventListener('click',()=>this.setTab('SAFETY_GATE'));this.elements.explainTab.addEventListener('click',()=>this.setTab('EXPLAIN'));this.elements.auditButton.addEventListener('click',()=>this.downloadAuditExport());this.elements.clearButton.addEventListener('click',()=>this.clear());this.render();return this;}

  loadPackage(value){
    const next=requireEmpiricalV3SafetyPresentationPackage(value);this.packageValue=next;this.lastConfirmationReceipt=null;this.error='';
    this.restoreDownstream(next);this.message=`Loaded safety package for ${next.runId}. Workflow ${next.workflow.state}. Risk set ${next.riskSet.riskSetId}.`;this.render();return next;
  }
  restoreDownstream(packageValue){
    const resultHash=packageValue.workflow.facts.calculationResult.semanticHash;
    if(!resultHash){this.calculationEvidence=null;this.reviewAudit.clear();return;}
    const evidenceEntry=findRecord(packageValue,'CALCULATION_EVIDENCE',resultHash);
    if(evidenceEntry){const evidence=requireEmpiricalV3CoupledCalculationEvidence(evidenceEntry.record);this.calculationEvidence=evidenceMatchesPackage(evidence,packageValue)?evidence:null;}
    else if(this.calculationEvidence&&!evidenceMatchesPackage(this.calculationEvidence,packageValue))this.calculationEvidence=null;
    this.reviewAudit.clear();if(!this.calculationEvidence)return;
    const reviewHash=packageValue.workflow.facts.resultReview.semanticHash;const reviewEntry=findRecord(packageValue,'RESULT_REVIEW',reviewHash);
    if(reviewEntry)this.reviewAudit.loadResultReview(reviewEntry.record,this.calculationEvidence);
    const auditHash=packageValue.workflow.facts.audit.semanticHash;const auditEntry=findRecord(packageValue,'AUDIT_READINESS',auditHash);
    if(auditEntry&&this.reviewAudit.resultReview)this.reviewAudit.loadAuditReadiness(auditEntry.record,this.calculationEvidence);
  }
  loadCalculationEvidence(value){const evidence=requireEmpiricalV3CoupledCalculationEvidence(value);if(!this.packageValue||!evidenceMatchesPackage(evidence,this.packageValue))throw new Error('Calculation evidence is stale or belongs to another safety package authorization.');this.calculationEvidence=evidence;this.reviewAudit.invalidateForEvidence(evidence);this.activeTab='EXPLAIN';this.explainMode='SUMMARY';this.error='';this.message=`Loaded sealed calculation evidence ${evidence.evidenceId}.`;this.render();return evidence;}
  loadResultReviewReceipt(value){if(!this.calculationEvidence)throw new Error('Calculation evidence is required before result review.');const receipt=this.reviewAudit.loadResultReview(value,this.calculationEvidence);this.render();return receipt;}
  loadAuditReadiness(value){if(!this.calculationEvidence)throw new Error('Calculation evidence is required before audit readiness.');const readiness=this.reviewAudit.loadAuditReadiness(value,this.calculationEvidence);this.render();return readiness;}

  clear(){this.packageValue=null;this.calculationEvidence=null;this.reviewAudit.clear();this.lastConfirmationReceipt=null;this.activeTab='BRANCH_BASIS';this.explainMode='SUMMARY';this.error='';this.message='Empirical V3 safety/evidence workbench cleared.';this.render();}
  refresh(){this.render();return this.getSnapshot();}
  setTab(tab){if(!['BRANCH_BASIS','SAFETY_GATE','EXPLAIN'].includes(tab))throw new RangeError(`Unsupported Empirical V3 tab: ${tab}`);this.activeTab=tab;this.render();}
  setExplainMode(mode){if(!EMPIRICAL_V3_EXPLAIN_MODES.includes(mode))throw new RangeError(`Unsupported Empirical V3 Explain mode: ${mode}`);this.explainMode=mode;this.render();return mode;}
  openRisk(riskId){this.activeTab='SAFETY_GATE';this.render();return focusEmpiricalV3Risk(this.elements.content,riskId);}

  locateEntities(entityIds){const ids=uniqueTexts(entityIds);if(!ids.length)return;if(typeof this.options.onLocateEntities==='function')return this.options.onLocateEntities(ids);EventBus.publish(EVENT_TOPICS.VIEWPORT_SELECTION_REQUESTED,{entityId:ids[0],source:'api'});this.message=ids.length===1?`Located ${ids[0]}.`:`Located ${ids[0]}; ${ids.length-1} additional governed entities remain linked.`;this.renderStatus();}
  showRecord(ref,semanticHash){const entry=this.packageValue?.records.find((row)=>row.ref===ref&&(!semanticHash||row.semanticHash===semanticHash))??null;renderEmpiricalV3EvidenceInspector(this.elements.evidence,entry);if(!entry)this.error=`No sealed presentation record is available for ${ref}.`;this.renderStatus();return entry;}

  reviewAssumption(risk,review={}){
    if(!this.packageValue)throw new Error('A current safety package is required.');
    try{const receipt=createEngineeringConfirmationReceipt({risk,basisCode:'ENGINEER_CONFIRMED_CURRENT_ASSUMPTION',basisParameters:{riskSemanticHash:risk.semanticHash,reasonCode:risk.reasonCode,valueSnapshot:risk.valueSnapshot},authorityRefs:risk.authorityRefs.filter((ref)=>ref.semanticHash),auditMetadata:{actor:requiredText(review.actor,'Reviewer'),timestamp:new Date().toISOString(),comment:requiredText(review.comment,'Review basis / comment')}});this.lastConfirmationReceipt=receipt;this.error='';this.message=`Created singular confirmation ${receipt.receiptId}. The Safety Gate remains unchanged until a re-evaluated sealed package is supplied.`;const next=this.options.onConfirmationCreated?.(receipt,this.packageValue)??null;if(next)this.loadPackage(next);this.render();return receipt;}catch(error){return this.fail('Engineering assumption confirmation was rejected.',error);}
  }

  reviewResult(review={}){
    if(!this.calculationEvidence)throw new Error('Sealed calculation evidence is required for result review.');if(this.packageValue?.workflow.state!=='RESULT_REVIEW_REQUIRED')throw new Error('Result review requires current RESULT_REVIEW_REQUIRED workflow.');
    try{const result=this.reviewAudit.review(this.calculationEvidence,review);if(result.nextPackage)this.loadPackage(result.nextPackage);this.error='';this.message=`Recorded result review ${result.receipt.receiptId}. Audit readiness is a separate governed transition.`;this.render();return result.receipt;}catch(error){return this.fail('Empirical V3 result review was rejected.',error);}
  }
  prepareAudit(){
    if(!this.calculationEvidence||this.packageValue?.workflow.state!=='RESULT_REVIEWED')throw new Error('Audit readiness requires current RESULT_REVIEWED workflow.');
    try{const result=this.reviewAudit.prepareAudit(this.calculationEvidence);if(result.nextPackage)this.loadPackage(result.nextPackage);this.error='';this.message=`Sealed audit readiness ${result.readiness.readinessId}.`;this.render();return result.readiness;}catch(error){return this.fail('Empirical V3 audit readiness was rejected.',error);}
  }

  isRunReady(){return Boolean(this.packageValue?.workflow.canRunCalculation&&this.packageValue.calculationAuthorization&&typeof this.options.onRunRequested==='function'&&(typeof this.options.isRunReady!=='function'||this.options.isRunReady(this.packageValue)));}
  requestRun(){if(!this.isRunReady())throw new Error('Empirical V3 calculation requires current sealed authorization and prepared execution custody.');const result=this.options.onRunRequested({authorization:this.packageValue.calculationAuthorization,packageValue:this.packageValue});return result?.then?result.then((value)=>this.acceptRunResult(value)):this.acceptRunResult(result);}
  acceptRunResult(result){if(result?.nextPackage)this.loadPackage(result.nextPackage);if(result?.evidence)this.loadCalculationEvidence(result.evidence);return result;}

  createAuditExport(){
    if(typeof this.options.onAuditExportRequested==='function'){
      const result=this.options.onAuditExportRequested({packageValue:this.packageValue,evidence:this.calculationEvidence,resultReview:this.reviewAudit.resultReview,auditReadiness:this.reviewAudit.auditReadiness});
      if(result?.nextPackage)this.loadPackage(result.nextPackage);return result?.record??result;
    }
    return this.reviewAudit.createAuditExport(this.packageValue?.workflow.state,this.calculationEvidence,this.packageValue);
  }
  downloadAuditExport(){try{const record=this.createAuditExport();downloadRecord(this.documentRef,this.urlApi,record);this.error='';this.message=`Downloaded ${record.fileName}.`;this.renderStatus();return record;}catch(error){return this.fail('Empirical V3 audit export was rejected.',error);}}

  getSnapshot(){return Object.freeze({status:this.packageValue?'CURRENT':'EMPTY',runId:this.packageValue?.runId??null,workflowState:this.packageValue?.workflow.state??'NO_PACKAGE',packageSemanticHash:this.packageValue?.semanticHash??null,riskSetSemanticHash:this.packageValue?.riskSet.semanticHash??null,calculationEvidenceId:this.calculationEvidence?.evidenceId??null,calculationEvidenceSemanticHash:this.calculationEvidence?.semanticHash??null,resultReviewReceiptId:this.reviewAudit.resultReview?.receiptId??null,auditReadinessId:this.reviewAudit.auditReadiness?.readinessId??null,activeTab:this.activeTab,explainMode:this.explainMode,lastConfirmationReceiptId:this.lastConfirmationReceipt?.receiptId??null,message:this.message,error:this.error||null});}
  getPackage(){return this.packageValue;}getCalculationEvidence(){return this.calculationEvidence;}getResultReviewReceipt(){return this.reviewAudit.resultReview;}getAuditReadiness(){return this.reviewAudit.auditReadiness;}getLastConfirmationReceipt(){return this.lastConfirmationReceipt;}

  render(){
    if(!this.elements)return;this.renderStatus();const hasPackage=Boolean(this.packageValue);const hasEvidence=Boolean(this.calculationEvidence);
    for(const[element,tab]of[[this.elements.branchTab,'BRANCH_BASIS'],[this.elements.safetyTab,'SAFETY_GATE'],[this.elements.explainTab,'EXPLAIN']])element.setAttribute('aria-selected',String(this.activeTab===tab));
    this.elements.explainTab.disabled=!hasEvidence;this.elements.auditButton.disabled=!this.reviewAudit.canExport(this.packageValue?.workflow.state,this.calculationEvidence);this.elements.clearButton.disabled=!hasPackage&&!hasEvidence;
    if(!hasPackage){this.elements.content.replaceChildren(emptyParagraph(this.documentRef));renderEmpiricalV3EvidenceInspector(this.elements.evidence,null);return;}
    if(this.activeTab==='EXPLAIN'){this.renderExplain();return;}
    const actions={locate:(ids)=>this.locateEntities(ids),showRecord:(ref,hash)=>this.showRecord(ref,hash),openRisk:(id)=>this.openRisk(id),review:(risk,review)=>this.reviewAssumption(risk,review),run:this.isRunReady()?()=>this.requestRun():null};
    if(this.activeTab==='BRANCH_BASIS')renderEmpiricalV3BranchBasis(this.elements.content,this.packageValue,actions);else renderEmpiricalV3SafetyGate(this.elements.content,this.packageValue,actions);
  }
  renderExplain(){renderEmpiricalV3EvidenceInspector(this.elements.evidence,null);const explain=this.documentRef.createElement('div');const review=this.documentRef.createElement('div');renderEmpiricalV3ExplainCalculation(explain,this.calculationEvidence,{mode:this.explainMode,onModeChange:(mode)=>this.setExplainMode(mode),packageValue:this.packageValue});renderEmpiricalV3ResultReview(review,{evidence:this.calculationEvidence,resultReview:this.reviewAudit.resultReview,auditReady:this.reviewAudit.auditReadiness},{review:this.packageValue.workflow.state==='RESULT_REVIEW_REQUIRED'?(value)=>this.reviewResult(value):null,prepareAudit:this.packageValue.workflow.state==='RESULT_REVIEWED'&&this.reviewAudit.resultReview&&!this.reviewAudit.auditReadiness?()=>this.prepareAudit():null});this.elements.content.replaceChildren(explain,review);}
  renderStatus(){if(!this.elements)return;this.elements.status.textContent=this.message;this.elements.error.hidden=!this.error;this.elements.error.textContent=this.error;}
  fail(message,error){this.error=errorMessage(error);this.message=message;this.render();throw error;}
  destroy(){this.elements?.section.remove();this.elements=null;this.packageValue=null;this.calculationEvidence=null;this.reviewAudit.clear();this.lastConfirmationReceipt=null;}
}

function findRecord(packageValue,kind,semanticHash){if(!semanticHash)return null;return packageValue.records.find((row)=>row.kind===kind&&row.semanticHash===semanticHash)??null;}
function evidenceMatchesPackage(evidence,packageValue){return evidence.runId===packageValue.runId&&Boolean(packageValue.calculationAuthorization)&&evidence.authorizationRef.semanticHash===packageValue.calculationAuthorization.semanticHash;}
function downloadRecord(doc,urlApi,record){if(!urlApi?.createObjectURL||!urlApi?.revokeObjectURL)throw new Error('Browser download URL API is unavailable.');const BlobCtor=doc.defaultView?.Blob??globalThis.Blob;const url=urlApi.createObjectURL(new BlobCtor([record.text],{type:record.mimeType}));try{const link=doc.createElement('a');link.href=url;link.download=record.fileName;link.click();}finally{urlApi.revokeObjectURL(url);}}
function emptyParagraph(doc){const p=doc.createElement('p');p.className='empirical-v3-safety__empty';p.textContent='Load a sealed safety presentation package to review Branch Basis, the Safety Gate, and calculation evidence.';return p;}
function uniqueTexts(value){if(!Array.isArray(value))throw new TypeError('entityIds must be an array.');return[...new Set(value.map((item)=>requiredText(item,'entityId')))];}
function errorMessage(error){return error instanceof Error?error.message:String(error);}
function requiredText(value,fieldName){const text=String(value??'').trim();if(!text)throw new TypeError(`${fieldName} is required.`);return text;}
