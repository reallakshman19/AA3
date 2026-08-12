import assert from 'node:assert/strict';
import {
  PIPE_SECTION_FORMULATION_ID,
  PIPE_SECTION_PROFILE,
  PIPE_SECTION_REQUEST_SCHEMA,
  computePipeSectionRequestSemanticHash,
  resolvePipeSection,
} from '../src/core/linear-fea-section/index.js';
import {
  LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID,
  createLinearPipingInputXmlIntake,
} from '../src/workspace/linear-piping-inputxml-intake.js';
import {
  authorizeLinearPipingInputXmlPreFlight,
  prepareLinearPipingInputXmlPreFlight,
} from '../src/workspace/linear-piping-inputxml-prefea.js';
import { codeProfile, editionDataset, stressFactorSet } from './lfea-b4.0-code-engine-fixtures.mjs';

export function targetAuthority(record) {
  const structural = record.preparation.structuralPreparation;
  const binding = structural.segmentBindings.find((row) => row.componentKind === 'STRAIGHT_PIPE');
  assert.ok(binding);
  const material = structural.materialResolutions
    .find((row) => row.semanticHash === binding.materialResolutionSemanticHash);
  const nominalSection = structural.sectionResolutions
    .find((row) => row.semanticHash === binding.analysisSectionSemanticHash);
  assert.ok(material);
  assert.ok(nominalSection);
  return {
    elementId: binding.elementId,
    materialId: material.materialState.materialId,
    nominalSection,
  };
}

export function b31Input(record, target) {
  const caseId = LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID;
  return {
    parentSourceBundleSemanticHash: record.preparation.sourceBundleSemanticHash,
    parentModelSemanticHash: record.preparation.modelSemanticHash,
    codeProfile: codeProfile(),
    editionDataset: editionDataset({ materialId: target.materialId }),
    checks: [{
      checkId: 'B31-SUS-NATIVE-STRAIGHT-I',
      category: 'SUSTAINED',
      elementId: target.elementId,
      end: 'I',
      combinationId: caseId,
      actionSource: { kind: 'SINGLE_CASE', caseId },
      evaluationCaseId: caseId,
      stressFactorSet: stressFactorSet({
        factorSetId: 'SF-NATIVE-STRAIGHT-FIXTURE',
        componentId: target.elementId,
      }),
      sectionBasisReason: 'Qualification reviewer explicitly selects this sealed B-2.3 section as the sustained code section; no allowance is inferred by the adapter.',
      sustainedSectionResolution: target.nominalSection,
      pressureStressContribution: { value: 0, source: 'FIXTURE-NATIVE-B31-NOT-ASME' },
      coldTemperature: null,
      sustainedStress: null,
      occasionalCategoryId: null,
    }],
  };
}

export function wrongMaterialDataset() {
  return editionDataset({ materialId: 'WRONG-MATERIAL-FIXTURE' });
}

export function pipeSection(sectionStateId, outerDiameter, wallThickness) {
  const base = {
    schema: PIPE_SECTION_REQUEST_SCHEMA,
    sectionStateId,
    formulationId: PIPE_SECTION_FORMULATION_ID,
    outerDiameter,
    wallThickness,
    sourceEvidence: {
      sourceId: 'LFEA-NATIVE-B31-QUALIFICATION',
      sourceRevision: '00',
      sourceSemanticHash: 'fnv1a64:bbbbbbbbbbbbbbbb',
    },
  };
  return resolvePipeSection({
    request: { ...base, semanticHash: computePipeSectionRequestSemanticHash(base) },
    profile: PIPE_SECTION_PROFILE,
  });
}

export function authorizedPreFlight(content) {
  const intake = createLinearPipingInputXmlIntake({ fileName: 'native-b31.xml', content }, {
    requestedProfileId: 'STRICT_INPUTXML_LINEAR_STATIC_V1',
    requestedCaseIds: [LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID],
  });
  let record = prepareLinearPipingInputXmlPreFlight(intake);
  if (record.status === 'BLOCK') throw new Error('Native B31 qualification fixture unexpectedly BLOCKED.');
  if (!record.solveAuthorized) {
    record = authorizeLinearPipingInputXmlPreFlight(record, {
      approverIdentity: 'LFEA-NATIVE-B31-QUALIFICATION',
      reason: 'Test-only acceptance of the complete retained conditional limitation set.',
    });
  }
  return record;
}

export function fixtureXml(length) {
  return `<CAESARII xmlns="COADE" VERSION="14.00" XML_TYPE="Input"><UNITS>
  <LENGTH LABEL="MM" FACTOR="25.4"/><FORCE LABEL="N" FACTOR="4.4482216152605"/>
  <MOMENT-INPUT LABEL="N-M" FACTOR="0.1129848290276167"/><STRESS LABEL="MPA" FACTOR="0.006894757293168"/>
  <PRESSURE LABEL="MPA" FACTOR="0.006894757293168"/><EMOD LABEL="MPA" FACTOR="0.006894757293168"/>
  <TEMP LABEL="C" FACTOR="0.5555555555555556"/><PDENS LABEL="KG/M3" FACTOR="27679.9047102"/>
  <IDENS LABEL="KG/M3" FACTOR="27679.9047102"/><FDENS LABEL="KG/M3" FACTOR="27679.9047102"/>
  </UNITS><PIPINGMODEL xmlns="" JOBNAME="LFEA-NATIVE-B31">
  <PIPINGELEMENT FROM_NODE="10" TO_NODE="20" DELTA_X="${length}" DELTA_Y="0" DELTA_Z="0"
  DIAMETER="114.3" WALL_THICK="6.02" MATERIAL_NAME="A106 Grade B" MATERIAL_NUM="106"
  MODULUS="200000" POISSONS="0.3" PIPE_DENSITY="7850" TEMP_EXP_C1="100">
  <RESTRAINT NODE="10" TYPE="0" XCOSINE="1" YCOSINE="0" ZCOSINE="0"/>
  </PIPINGELEMENT></PIPINGMODEL></CAESARII>`;
}
