#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { MODEL_SCHEMA, QUALIFICATION_PROFILE } from '../src/core/local-continuum/index.js';
import { canonicalLafeaSha256 } from '../src/workspace/lafea-canonical-sha256.js';
import { requireLafeaStageComposition } from '../src/workspace/lafea-stage-composition-root.js';
import { runPython } from './lib/python-interpreter.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const B01 = path.join(ROOT, 'validation/lafea-benchmark-data/B01');
const CASES_FILE = path.join(B01, 'oracle/cases.json');
const EXPECTED_FILE = path.join(B01, 'oracle/expected-values.json');
const SEMANTICS_FILE = path.join(B01, 'governance/fem-semantics.json');
const MESH_GENERATOR = path.join(B01, 'mesh-generator.py');
const MESH_SUMMARY = path.join(B01, 'meshes/mesh-generation-summary.json');
const SELF = fileURLToPath(import.meta.url);
const VARIANTS = Object.freeze([
  'TRANSLATED',
  'ROTATED_37_DEG',
  'LOAD_SCALED_2P5',
  'LOAD_REVERSED',
  'UNIT_SCALED_MM_TO_M',
]);
const args = parseArgs(process.argv.slice(2));

if (args.single) {
  const receipt = runOne(args);
  console.log(JSON.stringify(receipt));
  process.exit(receipt.status === 'PASS' ? 0 : 1);
}
runMatrix(args);

function runMatrix(options) {
  const gitHead = git(['rev-parse', 'HEAD']);
  const cleanTreeAtStart = git(['status', '--porcelain=v1', '--untracked-files=all']) === '';
  if (!cleanTreeAtStart && !options.allowDirty) {
    throw new Error('B01 metamorphic qualification requires a clean tree.');
  }
  const cases = read(CASES_FILE).cases;
  const meshes = read(MESH_SUMMARY).meshes;
  const variants = options.variant ? [options.variant] : [...VARIANTS];
  const selections = [];
  for (const caseDef of cases) {
    if (options.caseId && options.caseId !== caseDef.caseId) continue;
    for (const mesh of meshes) {
      if (options.family && options.family !== mesh.family) continue;
      if (options.mesh && options.mesh !== mesh.meshId) continue;
      selections.push({ caseId: caseDef.caseId, family: mesh.family, meshId: mesh.meshId });
    }
  }
  if (!selections.length) throw new Error('No B01 metamorphic runs selected.');

  const rows = selections.map((selection) => {
    const childArgs = [
      SELF, '--single', '--case', selection.caseId,
      '--family', selection.family, '--mesh', selection.meshId,
      '--git-head', gitHead,
    ];
    if (options.variant) childArgs.push('--variant', options.variant);
    const child = spawnSync(process.execPath, childArgs, {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    let execution;
    try {
      execution = JSON.parse(child.stdout.trim());
    } catch {
      execution = {
        status: 'FAIL',
        diagnostics: [{
          code: 'CHILD_RECEIPT_PARSE_FAILURE',
          path: 'metamorphic child',
          message: child.stderr || child.stdout,
        }],
        variants: [],
      };
    }
    return {
      ...selection,
      exitCode: child.status,
      signal: child.signal,
      stdoutSha256: shaText(child.stdout),
      stderrSha256: shaText(child.stderr),
      execution,
    };
  });

  const reportDir = path.resolve(ROOT, options.reportDir ?? 'reports/qualification/B01/metamorphic');
  fs.mkdirSync(reportDir, { recursive: true });
  for (const row of rows) {
    write(path.join(reportDir, `${row.family}-${row.meshId.split('-').at(-1)}-${row.caseId}.json`), row);
  }
  const variantRows = rows.flatMap((row) => row.execution.variants ?? []);
  const failedVariants = variantRows.filter((row) => row.status !== 'PASS');
  const expectedCount = selections.length * variants.length;
  const masterBase = {
    schema: 'lafea-b01-metamorphic-master/v1',
    issue: 1100,
    stageId: 'LAFEA.3',
    gitHead,
    cleanTreeAtStart,
    dirtyTreeOverrideUsed: !cleanTreeAtStart && options.allowDirty,
    variants,
    route: routeIdentity(),
    custody: custody(),
    selectedBaseIdentityCount: selections.length,
    selectedVariantRunCount: variantRows.length,
    expectedVariantRunCount: expectedCount,
    passCount: variantRows.length - failedVariants.length,
    failCount: failedVariants.length + Math.max(0, expectedCount - variantRows.length),
    status: failedVariants.length || variantRows.length !== expectedCount ? 'FAIL' : 'PASS',
    failedRuns: failedVariants.map((row) => ({
      caseId: row.caseId,
      family: row.family,
      meshId: row.meshId,
      variant: row.variant,
      firstFailedBoundary: row.firstFailedBoundary,
      diagnostics: row.diagnostics,
    })),
    releaseAuthorityGrantedByProgram: false,
    temperatureAuthorityGrantedByProgram: false,
  };
  const master = { ...masterBase, evidenceHash: canonicalLafeaSha256(masterBase) };
  write(path.join(reportDir, 'B01-metamorphic-master.json'), master);
  console.log(JSON.stringify(master));
  process.exit(master.status === 'PASS' ? 0 : 1);
}

function runOne(options) {
  const casesDoc = read(CASES_FILE);
  const caseDef = casesDoc.cases.find((row) => row.caseId === options.caseId);
  const expected = read(EXPECTED_FILE).cases.find((row) => row.caseId === options.caseId);
  const meshSummary = read(MESH_SUMMARY).meshes.find((row) => (
    row.family === options.family && row.meshId === options.mesh
  ));
  const semantics = read(SEMANTICS_FILE);
  const variants = options.variant ? [options.variant] : [...VARIANTS];
  if (!caseDef || !expected || !meshSummary || variants.some((variant) => !VARIANTS.includes(variant))) {
    return { status: 'FAIL', variants: [], diagnostics: [{ code: 'UNKNOWN_CASE_MESH_OR_VARIANT', path: 'selection', message: 'Case, mesh, oracle, or variant not found.' }] };
  }
  let compact;
  try {
    compact = JSON.parse(runPython([MESH_GENERATOR, '--emit', '--family', options.family, '--mesh', options.mesh],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
    ));
  } catch (error) {
    return { status: 'FAIL', variants: [], diagnostics: [diagnostic('MESH_GENERATION_FAILURE', 'mesh generator', error)] };
  }
  assert.equal(compact.meshSemanticHash, meshSummary.meshSemanticHash);
  const baseMesh = physicalMesh(compact, caseDef);
  const baseDescriptor = descriptor(caseDef, expected, baseMesh, 'BASE');
  const baseExecution = executeRoute(caseDef, baseDescriptor, options);
  if (!baseExecution.ok) {
    return {
      schema: 'lafea-b01-metamorphic-pair/v1',
      issue: 1100,
      caseId: caseDef.caseId,
      family: options.family,
      meshId: options.mesh,
      gitHead: options.gitHead ?? git(['rev-parse', 'HEAD']),
      base: baseExecution.receipt,
      variants: variants.map((variant) => ({
        caseId: caseDef.caseId, family: options.family, meshId: options.mesh,
        variant, status: 'FAIL', firstFailedBoundary: 'BASE_REGISTERED_ROUTE',
        diagnostics: baseExecution.receipt.diagnostics,
      })),
      status: 'FAIL',
      diagnostics: baseExecution.receipt.diagnostics,
      releaseAuthorityGrantedByProgram: false,
    };
  }

  const variantRows = variants.map((variant) => {
    const transformed = descriptor(caseDef, expected, baseMesh, variant);
    const execution = executeRoute(caseDef, transformed, options);
    if (!execution.ok) {
      return {
        caseId: caseDef.caseId, family: options.family, meshId: options.mesh,
        variant, ...execution.receipt, status: 'FAIL',
      };
    }
    const analytic = compareAnalytic(caseDef, transformed, execution.result, semantics);
    const relation = compareRelation(
      variant,
      baseExecution.result,
      execution.result,
      transformed,
      semantics,
    );
    const failures = [...analytic.failures, ...relation.failures];
    return {
      caseId: caseDef.caseId,
      family: options.family,
      meshId: options.mesh,
      variant,
      route: execution.receipt.route,
      custody: execution.receipt.custody,
      result: execution.receipt.result,
      comparison: { analytic: analytic.metrics, relation: relation.metrics },
      status: failures.length ? 'FAIL' : 'PASS',
      firstFailedBoundary: failures[0]?.boundary ?? null,
      diagnostics: failures.map(({ code, path: diagnosticPath, message }) => ({
        code, path: diagnosticPath, message,
      })),
      releaseAuthorityGrantedByProgram: false,
    };
  });
  return {
    schema: 'lafea-b01-metamorphic-pair/v1',
    issue: 1100,
    stageId: 'LAFEA.3',
    caseId: caseDef.caseId,
    family: options.family,
    meshId: options.mesh,
    gitHead: options.gitHead ?? git(['rev-parse', 'HEAD']),
    base: baseExecution.receipt,
    variants: variantRows,
    status: variantRows.every((row) => row.status === 'PASS') ? 'PASS' : 'FAIL',
    diagnostics: variantRows.flatMap((row) => row.diagnostics ?? []),
    releaseAuthorityGrantedByProgram: false,
  };
}

function executeRoute(caseDef, transformed, options) {
  const composition = requireLafeaStageComposition('LAFEA.3');
  const source = sourceModel(caseDef, transformed);
  const receipt = {
    variant: transformed.variant,
    route: {
      compositionRootId: composition.compositionRootId,
      registryAuthority: composition.registryEntry.authority,
      enginePackage: composition.registryEntry.enginePackage,
      sequence: ['normalizeDocument', 'canonicalize', 'calculate', 'acceptResult', 'presentResult'],
    },
    custody: {
      casesSha256: shaFile(CASES_FILE),
      expectedSha256: shaFile(EXPECTED_FILE),
      semanticsSha256: shaFile(SEMANTICS_FILE),
      meshGeneratorSha256: shaFile(MESH_GENERATOR),
      meshSummarySha256: shaFile(MESH_SUMMARY),
      physicalCanonicalMeshSemanticHash: canonicalLafeaSha256(transformed.canonicalMesh),
      sourceModelSemanticHash: canonicalLafeaSha256(source),
    },
    diagnostics: [],
  };
  let normalized;
  let model;
  let result;
  try {
    normalized = composition.normalizeDocument(source);
  } catch (error) {
    return routeFailure(receipt, 'SOURCE_CONTRACT_OR_NORMALIZATION', error);
  }
  try {
    model = composition.canonicalize(normalized);
  } catch (error) {
    return routeFailure(receipt, 'CANONICALIZATION_OR_UNITS', error);
  }
  try {
    result = composition.calculate(model);
  } catch (error) {
    return routeFailure(receipt, 'REGISTERED_CALCULATION', error);
  }
  receipt.custody.canonicalModelSemanticHash = model.semanticHash;
  receipt.result = {
    qualificationState: result?.qualification?.state ?? null,
    acceptedByRegisteredAcceptance: composition.acceptResult(result),
    executionEvidenceHash: result?.semanticHashes?.executionEvidenceHash ?? null,
    qualificationEvidenceHash: result?.semanticHashes?.qualificationEvidenceHash ?? null,
    resultSemanticHash: canonicalLafeaSha256(result),
  };
  if (!receipt.result.acceptedByRegisteredAcceptance) {
    const routeDiagnostic = result?.diagnostics?.[0] ?? {
      code: 'REGISTERED_ROUTE_REJECTED', path: 'calculation', message: 'Route rejected.',
    };
    receipt.status = 'FAIL';
    receipt.firstFailedBoundary = classify(routeDiagnostic);
    receipt.diagnostics = result?.diagnostics ?? [routeDiagnostic];
    return { ok: false, receipt };
  }
  try {
    receipt.result.presentedEvidenceHash = canonicalLafeaSha256(
      composition.presentResult(result, composition.resolveUnits(normalized)),
    );
  } catch (error) {
    return routeFailure(receipt, 'PRESENTER_OR_RESULT_CONTRACT', error);
  }
  receipt.status = 'PASS';
  return { ok: true, result, receipt };
}

function descriptor(caseDef, expected, baseMesh, variant) {
  const baseAffine = nums(caseDef.affine);
  const baseExpected = expectedNumbers(expected);
  if (variant === 'BASE') {
    return commonDescriptor(variant, baseMesh, baseMesh, baseAffine, baseAffine, baseExpected, {
      length: 'mm', force: 'N', stress: 'MPa', modulus: 'MPa',
    }, Number(caseDef.material.elasticModulus), Number(caseDef.geometry.thickness), 'IDENTITY', 1, 1);
  }
  if (variant === 'TRANSLATED') {
    const dx = 137.25;
    const dy = -84.5;
    const moved = transformMesh(baseMesh, (x, y) => [x + dx, y + dy], 'mm');
    return commonDescriptor(variant, moved, moved, baseAffine, baseAffine, baseExpected, {
      length: 'mm', force: 'N', stress: 'MPa', modulus: 'MPa',
    }, Number(caseDef.material.elasticModulus), Number(caseDef.geometry.thickness), 'IDENTITY', 1, 1);
  }
  if (variant === 'ROTATED_37_DEG') {
    const angle = 37 * Math.PI / 180;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const center = [Number(caseDef.geometry.width) / 2, Number(caseDef.geometry.height) / 2];
    const rotatedMesh = transformMesh(baseMesh, (x, y) => rotatePoint(x, y, center, c, s), 'mm');
    const rotatedAffine = rotateAffine(baseAffine, center, c, s);
    const rotatedExpected = {
      ...baseExpected,
      strain: rotateEngineeringStrain(baseExpected.strain, c, s),
      stress: rotateStress(baseExpected.stress, c, s),
    };
    return commonDescriptor(variant, rotatedMesh, rotatedMesh, rotatedAffine, rotatedAffine, rotatedExpected, {
      length: 'mm', force: 'N', stress: 'MPa', modulus: 'MPa',
    }, Number(caseDef.material.elasticModulus), Number(caseDef.geometry.thickness), 'ROTATE', 1, 1, { c, s });
  }
  if (variant === 'LOAD_SCALED_2P5' || variant === 'LOAD_REVERSED') {
    const factor = variant === 'LOAD_SCALED_2P5' ? 2.5 : -1;
    const scaledAffine = scaleAffine(baseAffine, factor);
    const scaledExpected = {
      strain: scaleRecord(baseExpected.strain, factor),
      stress: scaleRecord(baseExpected.stress, factor),
      energy: baseExpected.energy * factor * factor,
    };
    return commonDescriptor(variant, baseMesh, baseMesh, scaledAffine, scaledAffine, scaledExpected, {
      length: 'mm', force: 'N', stress: 'MPa', modulus: 'MPa',
    }, Number(caseDef.material.elasticModulus), Number(caseDef.geometry.thickness), 'SCALE', factor, factor * factor);
  }
  if (variant === 'UNIT_SCALED_MM_TO_M') {
    const sourceMesh = transformMesh(baseMesh, (x, y) => [x / 1000, y / 1000], 'm');
    const sourceAffine = { ...baseAffine, u0: baseAffine.u0 / 1000, v0: baseAffine.v0 / 1000 };
    return commonDescriptor(variant, baseMesh, sourceMesh, sourceAffine, baseAffine, baseExpected, {
      length: 'm', force: 'N', stress: 'Pa', modulus: 'Pa',
    }, Number(caseDef.material.elasticModulus) * 1e6, Number(caseDef.geometry.thickness) / 1000, 'IDENTITY', 1, 1);
  }
  throw new Error(`Unsupported metamorphic variant ${variant}.`);
}

function commonDescriptor(
  variant, canonicalMesh, sourceMesh, sourceAffine, canonicalAffine, expected,
  units, elasticModulus, thickness, reactionTransform, reactionFactor, energyFactor,
  rotation = null,
) {
  return {
    variant, canonicalMesh, sourceMesh, sourceAffine, canonicalAffine, expected,
    units, elasticModulus, thickness, reactionTransform, reactionFactor, energyFactor, rotation,
  };
}

function compareAnalytic(caseDef, transformed, result, semantics) {
  const loadCase = result.loadCaseResults?.find((row) => row.loadCaseId === 'AFFINE');
  assert.ok(loadCase, 'Missing AFFINE load case.');
  const failures = [];
  const metrics = {
    maxNodalDisplacementAbsoluteErrorMm: 0,
    maxStrainAbsoluteError: 0,
    maxStressAbsoluteErrorMPa: 0,
    strainEnergyAbsoluteErrorNmm: 0,
    netReactionForceN: null,
    netReactionMomentNmm: null,
    normalizedFreeDofInfinityResidual: null,
    minimumAuthoritativeJacobian: null,
  };
  const coordinates = new Map(transformed.canonicalMesh.nodes.map((node) => [node.nodeId, node]));
  for (const row of loadCase.nodalDisplacements) {
    const node = coordinates.get(row.nodeId);
    const target = affineAt(transformed.canonicalAffine, node.x, node.y);
    for (const [axis, actual, wanted] of [['UX', row.ux, target.ux], ['UY', row.uy, target.uy]]) {
      metrics.maxNodalDisplacementAbsoluteErrorMm = Math.max(
        metrics.maxNodalDisplacementAbsoluteErrorMm,
        Math.abs(actual - wanted),
      );
      const rule = Math.abs(wanted) <= magnitude(semantics.acceptance.zeroDisplacement.absolute)
        ? semantics.acceptance.zeroDisplacement
        : semantics.acceptance.nonzeroDisplacement;
      if (!within(actual, wanted, magnitude(rule.absolute), Number(rule.relative))) {
        failures.push(failure('METAMORPHIC_DISPLACEMENT_MISMATCH', `nodes.${row.nodeId}.${axis}`, `${actual} != ${wanted}`, 'METAMORPHIC_KINEMATICS_OR_SOLVE'));
      }
    }
  }
  const points = [];
  for (const element of loadCase.elementResults) {
    if (Array.isArray(element.gaussPointResults)) {
      for (const point of element.gaussPointResults) {
        points.push({ path: `elements.${element.elementId}.gauss.${point.pointId}`, strain: point.strain, stress: point.stress, detJ: point.jacobianDeterminant });
      }
    } else {
      points.push({ path: `elements.${element.elementId}`, strain: element.strain, stress: element.stress, detJ: null });
    }
  }
  const strainTarget = transformed.expected.strain;
  const stressTarget = transformed.expected.stress;
  for (const point of points) {
    for (const key of ['epsilonX', 'epsilonY', 'gammaXY']) {
      metrics.maxStrainAbsoluteError = Math.max(metrics.maxStrainAbsoluteError, Math.abs(point.strain[key] - strainTarget[key]));
      if (!within(point.strain[key], strainTarget[key], magnitude(semantics.acceptance.strain.absolute), Number(semantics.acceptance.strain.relative))) {
        failures.push(failure('METAMORPHIC_STRAIN_MISMATCH', `${point.path}.strain.${key}`, `${point.strain[key]} != ${strainTarget[key]}`, 'METAMORPHIC_ELEMENT_OR_TENSOR_TRANSFORM'));
      }
    }
    for (const key of ['sigmaX', 'sigmaY', 'sigmaZ', 'tauXY']) {
      metrics.maxStressAbsoluteErrorMPa = Math.max(metrics.maxStressAbsoluteErrorMPa, Math.abs(point.stress[key] - stressTarget[key]));
      const rule = Math.abs(stressTarget[key]) <= magnitude(semantics.acceptance.zeroStress.absolute)
        ? semantics.acceptance.zeroStress
        : semantics.acceptance.nonzeroStress;
      if (!within(point.stress[key], stressTarget[key], magnitude(rule.absolute), Number(rule.relative))) {
        failures.push(failure('METAMORPHIC_STRESS_MISMATCH', `${point.path}.stress.${key}`, `${point.stress[key]} != ${stressTarget[key]}`, 'METAMORPHIC_CONSTITUTIVE_OR_TENSOR_TRANSFORM'));
      }
    }
    if (point.detJ !== null) {
      metrics.minimumAuthoritativeJacobian = metrics.minimumAuthoritativeJacobian === null
        ? point.detJ
        : Math.min(metrics.minimumAuthoritativeJacobian, point.detJ);
      if (!(point.detJ > 0)) failures.push(failure('METAMORPHIC_NONPOSITIVE_JACOBIAN', `${point.path}.jacobianDeterminant`, String(point.detJ), 'METAMORPHIC_GEOMETRY_OR_ELEMENT_JACOBIAN'));
    }
  }
  metrics.strainEnergyAbsoluteErrorNmm = Math.abs(loadCase.totalStrainEnergy - transformed.expected.energy);
  if (!within(loadCase.totalStrainEnergy, transformed.expected.energy, magnitude(semantics.acceptance.strainEnergy.absolute), Number(semantics.acceptance.strainEnergy.relative))) {
    failures.push(failure('METAMORPHIC_ENERGY_MISMATCH', 'loadCases.AFFINE.totalStrainEnergy', `${loadCase.totalStrainEnergy} != ${transformed.expected.energy}`, 'METAMORPHIC_ENERGY'));
  }
  const reaction = resultant(loadCase.supportReactions, coordinates);
  metrics.netReactionForceN = reaction.force;
  metrics.netReactionMomentNmm = reaction.momentZ;
  const forceTolerance = magnitude(semantics.acceptance.netReaction.absolute);
  if (Math.abs(reaction.force.x) > forceTolerance || Math.abs(reaction.force.y) > forceTolerance) {
    failures.push(failure('METAMORPHIC_NET_REACTION_FORCE_MISMATCH', 'loadCases.AFFINE.supportReactions', JSON.stringify(reaction.force), 'METAMORPHIC_REACTION_EQUILIBRIUM'));
  }
  const momentTolerance = forceTolerance * Math.max(Number(caseDef.geometry.width), Number(caseDef.geometry.height));
  if (Math.abs(reaction.momentZ) > momentTolerance) {
    failures.push(failure('METAMORPHIC_NET_REACTION_MOMENT_MISMATCH', 'loadCases.AFFINE.supportReactions', `${reaction.momentZ} > ${momentTolerance}`, 'METAMORPHIC_REACTION_EQUILIBRIUM'));
  }
  const free = maxAbs(loadCase.freeDofResiduals.map((row) => row.value));
  const scale = Math.max(1, maxAbs(loadCase.supportReactions.map((row) => row.value)), maxAbs(loadCase.forceEvidence.forceVector));
  metrics.normalizedFreeDofInfinityResidual = free / scale;
  if (metrics.normalizedFreeDofInfinityResidual > Number(semantics.acceptance.normalizedFreeDofInfinityResidual.maximum)) {
    failures.push(failure('METAMORPHIC_FREE_DOF_RESIDUAL_MISMATCH', 'loadCases.AFFINE.freeDofResiduals', String(metrics.normalizedFreeDofInfinityResidual), 'METAMORPHIC_LINEAR_SOLVER_OR_ASSEMBLY'));
  }
  return { metrics, failures };
}

function compareRelation(variant, baseResult, transformedResult, transformed, semantics) {
  const base = baseResult.loadCaseResults.find((row) => row.loadCaseId === 'AFFINE');
  const actual = transformedResult.loadCaseResults.find((row) => row.loadCaseId === 'AFFINE');
  const failures = [];
  const tolerance = magnitude(semantics.acceptance.netReaction.absolute);
  const baseReactions = reactionMap(base.supportReactions);
  const actualReactions = reactionMap(actual.supportReactions);
  let maximumReactionRelationErrorN = 0;
  for (const [nodeId, baseVector] of baseReactions) {
    const actualVector = actualReactions.get(nodeId) ?? [NaN, NaN];
    let target;
    if (transformed.reactionTransform === 'ROTATE') {
      const { c, s } = transformed.rotation;
      target = [c * baseVector[0] - s * baseVector[1], s * baseVector[0] + c * baseVector[1]];
    } else {
      target = [baseVector[0] * transformed.reactionFactor, baseVector[1] * transformed.reactionFactor];
    }
    const error = Math.max(Math.abs(actualVector[0] - target[0]), Math.abs(actualVector[1] - target[1]));
    maximumReactionRelationErrorN = Math.max(maximumReactionRelationErrorN, error);
    if (!(error <= tolerance)) {
      failures.push(failure('METAMORPHIC_REACTION_RELATION_MISMATCH', `supportReactions.${nodeId}`, `${JSON.stringify(actualVector)} != ${JSON.stringify(target)}`, 'METAMORPHIC_REACTION_COVARIANCE'));
    }
  }
  const energyTarget = base.totalStrainEnergy * transformed.energyFactor;
  const energyError = Math.abs(actual.totalStrainEnergy - energyTarget);
  const energyPass = within(actual.totalStrainEnergy, energyTarget, magnitude(semantics.acceptance.strainEnergy.absolute), Number(semantics.acceptance.strainEnergy.relative));
  if (!energyPass) failures.push(failure('METAMORPHIC_ENERGY_RELATION_MISMATCH', 'loadCases.AFFINE.totalStrainEnergy', `${actual.totalStrainEnergy} != ${energyTarget}`, 'METAMORPHIC_ENERGY_SCALING'));
  return {
    metrics: {
      variant,
      maximumReactionRelationErrorN,
      reactionAbsoluteToleranceN: tolerance,
      energyRelationAbsoluteErrorNmm: energyError,
      energyRelationTargetNmm: energyTarget,
    },
    failures,
  };
}

function sourceModel(caseDef, transformed) {
  const imposed = transformed.sourceMesh.nodes
    .filter((node) => node.boundarySides.length)
    .flatMap((node, index) => {
      const displacement = affineAt(transformed.sourceAffine, node.x, node.y);
      return [
        { imposedDisplacementId: `ID-${index + 1}-UX`, nodeId: node.nodeId, dof: 'UX', value: displacement.ux, sourceReference: `B01#${transformed.variant}#AFFINE_BOUNDARY` },
        { imposedDisplacementId: `ID-${index + 1}-UY`, nodeId: node.nodeId, dof: 'UY', value: displacement.uy, sourceReference: `B01#${transformed.variant}#AFFINE_BOUNDARY` },
      ];
    });
  return {
    schema: MODEL_SCHEMA,
    modelIdentity: `B01_${caseDef.caseId}_${transformed.sourceMesh.meshId}_${transformed.variant}`,
    modelVersion: '1',
    sourceAncestry: {
      sourceModelIdentity: caseDef.caseId,
      sourceVersion: 'lafea-b01-affine-cases/v1',
      adapterIdentity: 'LAFEA3_B01_METAMORPHIC_REGISTERED_ROUTE',
      adapterVersion: '1',
    },
    units: transformed.units,
    formulation: caseDef.formulation,
    materials: [{
      materialId: 'MAT',
      elasticModulus: transformed.elasticModulus,
      poissonRatio: Number(caseDef.material.poissonRatio),
      sourceReference: `B01#${caseDef.caseId}#MATERIAL#${transformed.variant}`,
    }],
    nodes: transformed.sourceMesh.nodes.map((node) => ({
      nodeId: node.nodeId, x: node.x, y: node.y,
      sourceReference: `B01#${transformed.sourceMesh.meshId}#${node.nodeId}#${transformed.variant}`,
    })),
    elements: transformed.sourceMesh.elements.map((element) => ({
      elementId: element.elementId,
      elementType: element.elementType,
      nodeIds: element.nodeIds,
      materialId: 'MAT',
      thickness: transformed.thickness,
      sourceReference: `B01#${transformed.sourceMesh.meshId}#${element.elementId}#${transformed.variant}`,
    })),
    elementTypePolicy: {
      allowT3Fallback: transformed.sourceMesh.family === 'T3',
      sourceReference: transformed.sourceMesh.family === 'T3'
        ? 'B01#REGISTERED_T3_FALLBACK'
        : 'B01#REGISTERED_PRODUCTION_ELEMENT',
    },
    constraints: [],
    loadCases: [{
      loadCaseId: 'AFFINE',
      nodalForces: [], edgeTractions: [], pressureLoads: [], bodyForces: [], temperatureLoads: [],
      imposedDisplacements: imposed,
      sourceReference: `B01#${caseDef.caseId}#AFFINE#${transformed.variant}`,
    }],
    resultRequests: { loadCaseIds: ['AFFINE'] },
    qualificationProfile: JSON.parse(JSON.stringify(QUALIFICATION_PROFILE)),
    limitations: ['B01_AFFINE_CODE_VERIFICATION_ONLY', 'B01_METAMORPHIC_QUALIFICATION_ONLY', 'NO_RELEASE_AUTHORITY_FROM_B01'],
  };
}

function expectedNumbers(expected) {
  return {
    strain: {
      epsilonX: Number(expected.strain.epsilonXX),
      epsilonY: Number(expected.strain.epsilonYY),
      gammaXY: Number(expected.strain.gammaXY),
    },
    stress: {
      sigmaX: Number(expected.stressMPa.sigmaXX),
      sigmaY: Number(expected.stressMPa.sigmaYY),
      sigmaZ: Number(expected.stressMPa.sigmaZZ),
      tauXY: Number(expected.stressMPa.tauXY),
    },
    energy: Number(expected.strainEnergyNmm),
  };
}

function rotateAffine(affine, center, c, s) {
  const rotation = [[c, -s], [s, c]];
  const transpose = [[c, s], [-s, c]];
  const matrix = [[affine.ux, affine.uy], [affine.vx, affine.vy]];
  const rotatedMatrix = multiply2(multiply2(rotation, matrix), transpose);
  const atCenter = [
    affine.u0 + affine.ux * center[0] + affine.uy * center[1],
    affine.v0 + affine.vx * center[0] + affine.vy * center[1],
  ];
  const rotatedAtCenter = multiplyVector2(rotation, atCenter);
  const intercept = [
    rotatedAtCenter[0] - rotatedMatrix[0][0] * center[0] - rotatedMatrix[0][1] * center[1],
    rotatedAtCenter[1] - rotatedMatrix[1][0] * center[0] - rotatedMatrix[1][1] * center[1],
  ];
  return {
    u0: intercept[0], ux: rotatedMatrix[0][0], uy: rotatedMatrix[0][1],
    v0: intercept[1], vx: rotatedMatrix[1][0], vy: rotatedMatrix[1][1],
  };
}

function rotateEngineeringStrain(strain, c, s) {
  const tensor = [[strain.epsilonX, strain.gammaXY / 2], [strain.gammaXY / 2, strain.epsilonY]];
  const rotated = rotateTensor(tensor, c, s);
  return { epsilonX: rotated[0][0], epsilonY: rotated[1][1], gammaXY: 2 * rotated[0][1] };
}

function rotateStress(stress, c, s) {
  const tensor = [[stress.sigmaX, stress.tauXY], [stress.tauXY, stress.sigmaY]];
  const rotated = rotateTensor(tensor, c, s);
  return { sigmaX: rotated[0][0], sigmaY: rotated[1][1], sigmaZ: stress.sigmaZ, tauXY: rotated[0][1] };
}

function rotateTensor(tensor, c, s) {
  const rotation = [[c, -s], [s, c]];
  return multiply2(multiply2(rotation, tensor), [[c, s], [-s, c]]);
}

function transformMesh(mesh, transform, unit) {
  return {
    ...mesh,
    geometry: { ...mesh.geometry, unit },
    nodes: mesh.nodes.map((node) => {
      const [x, y] = transform(node.x, node.y);
      return { ...node, x, y };
    }),
  };
}

function rotatePoint(x, y, center, c, s) {
  const dx = x - center[0];
  const dy = y - center[1];
  return [center[0] + c * dx - s * dy, center[1] + s * dx + c * dy];
}

function physicalMesh(mesh, caseDef) {
  const width = Number(caseDef.geometry.width);
  const height = Number(caseDef.geometry.height);
  return {
    schema: 'lafea-b01-physical-mesh/v1',
    meshId: mesh.meshId,
    family: mesh.family,
    sourceNormalizedMeshSemanticHash: mesh.meshSemanticHash,
    geometry: { width, height, unit: 'mm' },
    nodes: mesh.nodes.map((row) => ({
      nodeId: row[0], kind: row.length === 5 ? 'MIDSIDE' : 'CORNER',
      x: Number(row[1]) * width, y: Number(row[2]) * height,
      boundarySides: row[3], ...(row.length === 5 ? { parentEdge: row[4] } : {}),
    })),
    elements: mesh.elements.map((row) => ({
      elementId: row[0], elementType: mesh.family, nodeIds: row[1], orientation: 'COUNTER_CLOCKWISE',
    })),
    midsideParentEdges: mesh.midsides.map((row) => ({
      midsideNodeId: row[0], parentEdgeNodeIds: [row[1], row[2]], policy: 'EXACT_PHYSICAL_MIDPOINT',
    })),
    topologyEvidence: mesh.topology,
  };
}

function reactionMap(rows) {
  const map = new Map();
  for (const row of rows) {
    const cut = row.dofIdentity.lastIndexOf(':');
    const nodeId = row.dofIdentity.slice(0, cut);
    const dof = row.dofIdentity.slice(cut + 1);
    const vector = map.get(nodeId) ?? [0, 0];
    vector[dof === 'UX' ? 0 : 1] = row.value;
    map.set(nodeId, vector);
  }
  return map;
}

function resultant(rows, coordinates) {
  let fx = 0; let fy = 0; let momentZ = 0;
  for (const row of rows) {
    const cut = row.dofIdentity.lastIndexOf(':');
    const nodeId = row.dofIdentity.slice(0, cut);
    const dof = row.dofIdentity.slice(cut + 1);
    const node = coordinates.get(nodeId);
    if (dof === 'UX') { fx += row.value; momentZ -= node.y * row.value; }
    else { fy += row.value; momentZ += node.x * row.value; }
  }
  return { force: { x: fx, y: fy }, momentZ };
}

function scaleAffine(affine, factor) {
  return Object.fromEntries(Object.entries(affine).map(([key, value]) => [key, value * factor]));
}
function scaleRecord(record, factor) {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, value * factor]));
}
function affineAt(affine, x, y) {
  return { ux: affine.u0 + affine.ux * x + affine.uy * y, uy: affine.v0 + affine.vx * x + affine.vy * y };
}
function multiply2(left, right) {
  return [[
    left[0][0] * right[0][0] + left[0][1] * right[1][0],
    left[0][0] * right[0][1] + left[0][1] * right[1][1],
  ], [
    left[1][0] * right[0][0] + left[1][1] * right[1][0],
    left[1][0] * right[0][1] + left[1][1] * right[1][1],
  ]];
}
function multiplyVector2(matrix, vector) {
  return [matrix[0][0] * vector[0] + matrix[0][1] * vector[1], matrix[1][0] * vector[0] + matrix[1][1] * vector[1]];
}
function nums(value) { return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, Number(item)])); }
function within(actual, expected, absolute, relative) { return Math.abs(actual - expected) <= Math.max(absolute, relative * Math.abs(expected)); }
function magnitude(value) { const parsed = Number.parseFloat(String(value)); if (!Number.isFinite(parsed)) throw new Error(`Invalid frozen tolerance ${value}`); return parsed; }
function maxAbs(values) { return values.reduce((maximum, value) => Math.max(maximum, Math.abs(value ?? 0)), 0); }
function failure(code, diagnosticPath, message, boundary) { return { code, path: diagnosticPath, message, boundary }; }
function diagnostic(code, diagnosticPath, error) { return { code, path: diagnosticPath, message: error instanceof Error ? error.message : String(error) }; }
function routeFailure(receipt, boundary, error) {
  const normalized = diagnostic(error?.code ?? 'METAMORPHIC_ROUTE_FAILURE', error?.path ?? boundary, error);
  receipt.status = 'FAIL'; receipt.firstFailedBoundary = boundary; receipt.diagnostics = [normalized];
  return { ok: false, receipt };
}
function classify(diagnosticRow) {
  const code = diagnosticRow?.code ?? '';
  if (code.includes('UNIT') || code.includes('NORMAL')) return 'CANONICALIZATION_OR_UNITS';
  if (code.includes('JACOBIAN') || code.includes('ELEMENT')) return 'ELEMENT_OR_MESH_QUALITY';
  if (code.includes('CONSTRAINT') || code.includes('DISPLACEMENT')) return 'BC_ASSEMBLY_OR_PARTITION';
  if (code.includes('SOLVER') || code.includes('RESIDUAL')) return 'LINEAR_SOLVER_OR_GLOBAL_ASSEMBLY';
  return 'REGISTERED_CALCULATION';
}
function routeIdentity() {
  const composition = requireLafeaStageComposition('LAFEA.3');
  return { compositionRootId: composition.compositionRootId, registryAuthority: composition.registryEntry.authority, enginePackage: composition.registryEntry.enginePackage };
}
function custody() {
  return { casesSha256: shaFile(CASES_FILE), expectedSha256: shaFile(EXPECTED_FILE), semanticsSha256: shaFile(SEMANTICS_FILE), meshGeneratorSha256: shaFile(MESH_GENERATOR), meshSummarySha256: shaFile(MESH_SUMMARY), runnerSha256: shaFile(SELF) };
}
function parseArgs(values) {
  const output = { single: false, allowDirty: false };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === '--single') output.single = true;
    else if (value === '--allow-dirty') output.allowDirty = true;
    else if (value === '--case') output.caseId = values[++index];
    else if (value === '--family') output.family = values[++index];
    else if (value === '--mesh') output.mesh = values[++index];
    else if (value === '--variant') output.variant = values[++index];
    else if (value === '--git-head') output.gitHead = values[++index];
    else if (value === '--report-dir') output.reportDir = values[++index];
    else throw new Error(`Unknown argument ${value}.`);
  }
  return output;
}
function read(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function write(file, value) { fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); }
function shaFile(file) { return `sha256:${crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}`; }
function shaText(text) { return `sha256:${crypto.createHash('sha256').update(text ?? '').digest('hex')}`; }
function git(parameters) { return execFileSync('git', parameters, { cwd: ROOT, encoding: 'utf8' }).trim(); }
