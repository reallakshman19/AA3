#!/usr/bin/env node
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(here, 'lfea-issue947-e36-production-condensation-audit.mjs');
const tempPath = join(here, '.issue947-e36-bend-translation-candidate.tmp.mjs');
let source = readFileSync(sourcePath, 'utf8');

const anchor = "const caesar = evaluate(condensed, caesarBoundaryDof, inferredCaesarSourceAction, pkg.profile.tolerances);";
if (!source.includes(anchor)) throw new Error('E36 condensation audit anchor not found.');
source = source.replace(anchor, `${anchor}\n\nconst bendTranslationEpsilon = closedEndPressureAxialStrain(branch, material.materialState.elasticModulus);\nconst bendTranslationFreeBoundaryDof = [\n  0, 0, 0, 0, 0, 0,\n  ...scale(subtract(geometry.tangentEnd, geometry.tangentStart), bendTranslationEpsilon),\n  0, 0, 0,\n];\nconst bendTranslationInitial = matrixVector(condensed.K, bendTranslationFreeBoundaryDof, 12);\nconst bendTranslationCandidateAction = subtract(caesar.fullAction, bendTranslationInitial);\nconst bendTranslationCandidateResidual = subtract(bendTranslationCandidateAction, inferredCaesarSourceAction);\nconst bendTranslationCandidateNormalizedResidual = normalizeResidual(\n  bendTranslationCandidateResidual,\n  inferredCaesarSourceAction,\n  pkg.profile.tolerances,\n);\nconst bendTranslationCandidate = {\n  authority: 'UNIFORM_CLOSED_END_PRESSURE_AXIAL_STRAIN_INTEGRATED_OVER_BEND_ARC_TO_NEAR_FAR_CHORD',\n  equation: 'delta_u=epsilon_p*(x_far-x_near), delta_theta=0; f0_candidate=K_condensed*d_free',\n  epsilon: bendTranslationEpsilon,\n  freeBoundaryDof: bendTranslationFreeBoundaryDof,\n  condensedInitialLoad: bendTranslationInitial,\n  action: bendTranslationCandidateAction,\n  residual: bendTranslationCandidateResidual,\n  normalizedResidual: bendTranslationCandidateNormalizedResidual,\n  normalizedResidualL2: Math.hypot(...bendTranslationCandidateNormalizedResidual),\n  maxAbsNormalizedResidual: Math.max(...bendTranslationCandidateNormalizedResidual.map(Math.abs)),\n};`);

const outputAnchor = "    diagnosticBalances: caesar.diagnosticBalances,";
if (!source.includes(outputAnchor)) throw new Error('E36 output anchor not found.');
source = source.replace(outputAnchor, `${outputAnchor}\n    bendTranslationCandidate,`);

writeFileSync(tempPath, source);
try {
  await import(`${pathToFileURL(tempPath).href}?candidate=${Date.now()}`);
} finally {
  unlinkSync(tempPath);
}
