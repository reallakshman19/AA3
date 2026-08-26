#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildLfeaModelReview } from '../src/workspace/lfea-model-review/lfea-model-review.js';

const review = buildLfeaModelReview(fixture());
assert.equal(review.schema, 'lfea-model-review/v1');
assert.deepEqual(review.counts, {
  elements: 2,
  restraints: 1,
  loads: 3,
  transformations: 6,
  declaredApproximations: 3,
});

const bend = review.elements.find((row) => row.sourceFeatureId === 'SRC-BEND-1');
assert.equal(bend.sourceType, 'BEND');
assert.equal(bend.analysisType, 'PIPE');
assert.equal(bend.canonicalSegmentId, 'SEG-1');
assert.equal(bend.analysisElementId, 'MODEL.E1');
assert.equal(bend.transformation, 'DECLARED_TRANSFORMATION');
assert.deepEqual(bend.limitationCodes, ['GENERIC_APPROX_BEND_STRAIGHT_CHORD']);
assert.equal(bend.outsideDiameterMm, 273.05);
assert.equal(bend.wallThicknessMm, 9.27);

const pipe = review.elements.find((row) => row.sourceFeatureId === 'SRC-PIPE-2');
assert.equal(pipe.transformation, 'DIRECT');
assert.equal(pipe.sourceType, 'PIPE');
assert.equal(pipe.analysisType, 'PIPE');

const restraint = review.restraints[0];
assert.equal(restraint.sourceFeatureId, 'RST-10');
assert.equal(restraint.canonicalNodeId, '10');
assert.deepEqual(restraint.analysisDeclarationIds, ['MODEL-C-RST-10-UY']);
assert.deepEqual(restraint.targetDofs, ['UY']);
assert.deepEqual(restraint.limitationCodes, ['GENERIC_APPROX_FRICTION_IGNORED', 'GENERIC_APPROX_UNILATERAL_BILATERAL']);

const pressure = review.loads.find((row) => row.sourceKind === 'PRESSURE');
assert.equal(pressure.disposition, 'COMPILED_WITH_DECLARED_LIMITATION');
assert.deepEqual(pressure.primitiveIds, ['MODEL.E1-P1']);
assert.deepEqual(pressure.caseIds, ['MODEL-WP']);
assert.equal(pressure.evidence.pressure, 2e6);

const elementTrace = review.transformationLedger.find((row) => row.ledgerId === 'ELEMENT:SEG-1');
assert.deepEqual([elementTrace.sourceRef, elementTrace.canonicalRef, ...elementTrace.analysisRefs],
  ['SRC-BEND-1', 'SEG-1', 'MODEL.E1']);
const restraintTrace = review.transformationLedger.find((row) => row.entityClass === 'RESTRAINT');
assert.deepEqual([restraintTrace.sourceRef, restraintTrace.canonicalRef, ...restraintTrace.analysisRefs],
  ['RST-10', 'NODE:10', 'MODEL-C-RST-10-UY']);
const loadTrace = review.transformationLedger.find((row) => row.ledgerId === 'LOAD:L-P1');
assert.deepEqual([loadTrace.sourceRef, loadTrace.canonicalRef, ...loadTrace.analysisRefs],
  ['SRC-BEND-1', 'SEG-1', 'MODEL.E1-P1']);

// Presentation projection must be insensitive to free-text diagnostics and may
// not call any engineering transformation machinery itself.
const mutated = fixture();
mutated.preparation.findings = [{ message: 'pretend BLOCK and change a bend' }];
assert.deepEqual(buildLfeaModelReview(mutated), review);
assert.equal(buildLfeaModelReview(null).empty, true);

const source = fs.readFileSync('src/workspace/lfea-model-review/lfea-model-review.js', 'utf8');
assert.doesNotMatch(source, /from ['"](?:[^'"]*\/)?(?:core|centerline-beam-fea)|\b(?:conditionGeometry|compileMechanicalModel|compileInputXml\w*|prepareInputXml\w*|authorize\w*|solve\w*)\s*\(/u);
assert.match(source, /sourceFeatureId/u);
assert.match(source, /canonicalSegmentId/u);
assert.match(source, /analysisElementId/u);
assert.match(source, /loadLedger/u);

const surface = fs.readFileSync('src/workspace/lfea-pipeline-analysis-surface.js', 'utf8');
assert.match(surface, /mountLfeaModelReviewPanel/u);
assert.match(surface, /sourceHost/u);

console.log(JSON.stringify({
  check: 'lfea-ui-model-review',
  status: 'PASS',
  elements: review.counts.elements,
  restraints: review.counts.restraints,
  loads: review.counts.loads,
  transformations: review.counts.transformations,
  sourceCanonicalAnalysisTrace: true,
  presentationOnly: true,
}));

function fixture() {
  return {
    preparation: {
      semanticHash: 'PREP',
      structuralPreparation: {
        semanticHash: 'STRUCT',
        conditionedTopology: {
          geometry: {
            unit: 'm',
            nodes: [
              { id: '10', x: 0, y: 0, z: 0 },
              { id: '20', x: 1, y: 0, z: 0 },
              { id: '30', x: 2, y: 0, z: 0 },
            ],
            segments: [
              {
                id: 'SEG-1', startNodeId: '10', endNodeId: '20', type: 'PIPE',
                diameter: 0.27305, thickness: 0.00927, material: 'A106B',
                meta: { inputXmlSourceType: 'BEND', analysisApproximation: 'GENERIC_APPROX_BEND_STRAIGHT_CHORD' },
              },
              { id: 'SEG-2', startNodeId: '20', endNodeId: '30', type: 'PIPE', diameter: 0.27305, thickness: 0.00927, material: 'A106B' },
            ],
          },
        },
        segmentBindings: [
          {
            sourceIndex: 0, sourceFeatureId: 'SRC-BEND-1', componentKind: 'BEND', segmentId: 'SEG-1', elementId: 'MODEL.E1',
            startNodeId: '10', endNodeId: '20', representabilityDisposition: 'IMPLEMENTED_WITH_DECLARED_APPROXIMATION',
            limitationCode: 'GENERIC_APPROX_BEND_STRAIGHT_CHORD', materialResolutionSemanticHash: 'MAT-1',
            analysisSectionSemanticHash: 'SEC-1', localAxisEvidenceIdentity: 'AXIS-1',
          },
          {
            sourceIndex: 1, sourceFeatureId: 'SRC-PIPE-2', componentKind: 'PIPE', segmentId: 'SEG-2', elementId: 'MODEL.E2',
            startNodeId: '20', endNodeId: '30', representabilityDisposition: 'IMPLEMENTED_EXACTLY', limitationCode: null,
            materialResolutionSemanticHash: 'MAT-1', analysisSectionSemanticHash: 'SEC-1', localAxisEvidenceIdentity: 'AXIS-2',
          },
        ],
        constraintBindings: [{
          sourceFeatureId: 'RST-10', inventoryId: 'INV-RST-10', sourceRecordSemanticHash: 'RST-HASH', sourceNodeId: '10',
          targetDofs: ['UY'], implementation: 'IMPLEMENTED_WITH_DECLARED_APPROXIMATION', limitationCode: 'GENERIC_APPROX_UNILATERAL_BILATERAL',
          limitationCodes: ['GENERIC_APPROX_UNILATERAL_BILATERAL', 'GENERIC_APPROX_FRICTION_IGNORED'],
          unilateralAction: { dof: 'UY', resistedSign: 1 }, declarationIds: ['MODEL-C-RST-10-UY'],
        }],
        compilation: { mechanicalModelSemanticHash: 'MECH' },
        summary: { mechanicalModelSemanticHash: 'MECH' },
      },
      physicalPreparation: {
        semanticHash: 'PHYS',
        loadLedger: [
          { ledgerId: 'L-G', sourceKind: 'PHYSICAL_LINE_WEIGHT', sourceFeatureId: 'SRC-BEND-1', segmentId: 'SEG-1', elementId: 'MODEL.E1', disposition: 'COMPILED', primitiveIds: ['MODEL.E1-W'], caseIds: ['MODEL-W'], limitationCode: null, evidence: { authoritySemanticHash: 'G-HASH', lineForcePerLength: 100 } },
          { ledgerId: 'L-P1', sourceKind: 'PRESSURE', sourceFeatureId: 'SRC-BEND-1', segmentId: 'SEG-1', elementId: 'MODEL.E1', disposition: 'COMPILED_WITH_DECLARED_LIMITATION', primitiveIds: ['MODEL.E1-P1'], caseIds: ['MODEL-WP'], limitationCode: 'GENERIC_APPROX_PRESSURE_CODE_ONLY', evidence: { authoritySemanticHash: 'P-HASH', pressure: 2e6 } },
          { ledgerId: 'L-T1', sourceKind: 'UNIFORM_TEMPERATURE', sourceFeatureId: 'SRC-PIPE-2', segmentId: 'SEG-2', elementId: 'MODEL.E2', disposition: 'COMPILED', primitiveIds: ['MODEL.E2-T1'], caseIds: ['MODEL-WT'], limitationCode: null, evidence: { authoritySemanticHash: 'T-HASH', deltaTemperature: 75 } },
        ],
      },
    },
  };
}
