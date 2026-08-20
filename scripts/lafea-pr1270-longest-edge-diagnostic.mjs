#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const evidencePath = 'src/workspace/lafea-analysis-mesh-evidence-v2.js';
const originalEvidence = fs.readFileSync(evidencePath, 'utf8');
const anchor = "  if (result.qualification !== 'PASS') {\n    fail('LAFEA_ANALYSIS_MESH_V2_REFINEMENT_ADJACENT_SIZE_RATIO_BLOCK');\n  }";
assert.ok(originalEvidence.includes(anchor), 'adjacency evidence anchor missing');
const instrumented = originalEvidence.replace(
  anchor,
  `  if (result.qualification !== 'PASS') {\n    const nodeById = new Map(mesh.nodes.map((node) => [node.nodeId, node]));\n    const elementById = new Map(mesh.elements.map((element) => [element.elementId, element]));\n    const rows = result.violatingAdjacencies.map((row) => {\n      const edgeNodes = row.nodeIds.map((id) => nodeById.get(id));\n      const edgeMid = {\n        x: (edgeNodes[0].x + edgeNodes[1].x) / 2,\n        y: (edgeNodes[0].y + edgeNodes[1].y) / 2,\n      };\n      const elements = row.elementIds.map((elementId) => {\n        const element = elementById.get(elementId);\n        const corners = element.nodeIds.slice(0, 3).map((id) => nodeById.get(id));\n        const centroid = {\n          x: corners.reduce((sum, node) => sum + node.x, 0) / 3,\n          y: corners.reduce((sum, node) => sum + node.y, 0) / 3,\n        };\n        return {\n          elementId,\n          centroid,\n          centroidRadiusFromPlateCenter: Math.hypot(centroid.x - 100, centroid.y - 60),\n        };\n      });\n      return {\n        ...row,\n        edgeNodes: edgeNodes.map((node) => ({ nodeId: node.nodeId, x: node.x, y: node.y })),\n        edgeMid,\n        edgeMidRadiusFromPlateCenter: Math.hypot(edgeMid.x - 100, edgeMid.y - 60),\n        elements,\n      };\n    });\n    console.error('PR1270_ADJACENCY_GEOMETRY=' + JSON.stringify({\n      maximumAllowed: result.maximumAllowed,\n      maximumObserved: result.maximumObserved,\n      violatingAdjacencyCount: result.violatingAdjacencyCount,\n      expectedBandInterfacesFromPlateCenter: [15, 60],\n      rows,\n    }));\n    fail('LAFEA_ANALYSIS_MESH_V2_REFINEMENT_ADJACENT_SIZE_RATIO_BLOCK');\n  }`,
);

try {
  fs.writeFileSync(evidencePath, instrumented);
  const run = spawnSync(process.execPath, ['scripts/lafea-retained-mesh-refinement-check.mjs'], {
    encoding: 'utf8',
  });
  process.stdout.write(run.stdout ?? '');
  process.stderr.write(run.stderr ?? '');
  assert.notEqual(run.status, 0, 'baseline unexpectedly passed while mapping blocker geometry');
  assert.match(`${run.stdout ?? ''}\n${run.stderr ?? ''}`, /PR1270_ADJACENCY_GEOMETRY=/u);
} finally {
  fs.writeFileSync(evidencePath, originalEvidence);
}
