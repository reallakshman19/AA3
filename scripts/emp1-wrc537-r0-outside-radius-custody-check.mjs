#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { calculateLocalAttachmentScreening } from '../src/core/local-attachment-screening/index.js';
import { createEmp1RetainedSectionScreeningLayer,deriveEmp1Wrc537SourceCustody,EMP1_WRC537_ATTACHMENT_DIAMETER_BASIS,EMP1_WRC537_ATTACHMENT_SOURCE_QUALIFICATION,EMP1_WRC537_R0_BASIS } from '../src/core/emp1/emp1-wrc537-source-custody.js';
import { deriveEmp1Wrc537CylindricalBoundedGeometry } from '../src/core/emp1/emp1-wrc537-cylindrical-bounded-adapter.js';
import { screeningRequestFixture } from './lafea.2-fixtures.mjs';

const methodDefinition=await readFile('docs/01_WRC537_METHOD_DEFINITION.md','utf8');
assert.match(methodDefinition,/r.?\s*\| Outside radius of cylindrical attachment/u,'WRC retained method definition must identify r0 as outside radius');

const request=screeningRequestFixture();
const screeningResult=calculateLocalAttachmentScreening(request);
assert.equal(screeningResult.qualification.state,'ACCEPTED');
const layer=createEmp1RetainedSectionScreeningLayer({screeningRequest:request,screeningResult,geometryIdentity:'EMP1-R0-CUSTODY-TEST',attachmentDiameter:35.42857142857143,attachmentSourceReference:'QUALIFICATION/ATTACHMENT-OUTSIDE-DIAMETER-AT-SHELL-JUNCTURE'});
assert.equal(layer.attachmentGeometryEvidence.diameterBasis,EMP1_WRC537_ATTACHMENT_DIAMETER_BASIS);
assert.equal(layer.attachmentGeometryEvidence.physicalLocation,'ATTACHMENT_SHELL_JUNCTURE');
assert.equal(layer.attachmentGeometryEvidence.sourceQualification,EMP1_WRC537_ATTACHMENT_SOURCE_QUALIFICATION);
assert.match(layer.attachmentGeometryEvidence.semanticHash,/^fnv1a64:[a-f0-9]{16}$/u);

const custody=deriveEmp1Wrc537SourceCustody({foundationResult:request.sourceEvidence.foundationResult,sectionScreening:layer,loadCaseIdentity:'LC-A'});
assert.equal(custody.geometry.attachmentRadiusBasis,EMP1_WRC537_R0_BASIS);
assert.equal(custody.geometry.attachmentRadiusSourceQualification,EMP1_WRC537_ATTACHMENT_SOURCE_QUALIFICATION);
close(custody.geometry.attachmentOutsideRadius,17.714285714285715,'source-derived WRC r0');
assert.equal(custody.geometry.attachmentRadius,custody.geometry.attachmentOutsideRadius,'legacy numeric alias may not change r0');
assert.equal(custody.attachmentGeometryEvidenceHash,layer.attachmentGeometryEvidence.semanticHash);
assert.equal(custody.geometrySourceReferences.attachmentDiameterBasis,EMP1_WRC537_ATTACHMENT_DIAMETER_BASIS);

let ambiguous=null;try{deriveEmp1Wrc537CylindricalBoundedGeometry({meanRadius:100,shellThickness:20,attachmentRadius:17.714285714285715});}catch(error){ambiguous=error;}
assert.equal(ambiguous?.code,'EMP1_WRC537_BOUNDED_ATTACHMENT_OUTSIDE_RADIUS_REQUIRED','qualified WRC geometry must reject an unlabeled generic attachment radius');
const explicit=deriveEmp1Wrc537CylindricalBoundedGeometry({meanRadius:100,shellThickness:20,attachmentOutsideRadius:17.714285714285715,gamma:5,beta:0.155});
assert.equal(explicit.attachmentRadiusBasis,EMP1_WRC537_R0_BASIS);close(explicit.beta,0.155,'beta from outside r0');

console.log(JSON.stringify({status:'PASS_WRC_R0_OUTSIDE_RADIUS_CUSTODY',sourceDefinition:'r0 = outside radius of cylindrical attachment',attachmentDiameterBasis:layer.attachmentGeometryEvidence.diameterBasis,r0Basis:custody.geometry.attachmentRadiusBasis,r0SourceQualification:custody.geometry.attachmentRadiusSourceQualification,r0:custody.geometry.attachmentOutsideRadius,beta:explicit.beta,ambiguousRadiusRejected:true,productionAuthority:false},null,2));
function close(actual,expected,label){const tol=Math.max(1,Math.abs(expected))*1e-12;assert.ok(Math.abs(actual-expected)<=tol,`${label}: actual=${actual} expected=${expected}`);}
