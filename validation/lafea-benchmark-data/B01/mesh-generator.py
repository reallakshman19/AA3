#!/usr/bin/env python3
"""Generate/check frozen normalized B01 T3/T6/Q8 mesh artifacts.

This generator is independent of LAFEA production meshing. It reads only the
frozen B01 ladder policy and writes normalized (x/W,y/H) benchmark templates.
Physical coordinates are produced by the registered-route runner from the
case geometry and retained in each execution receipt.
"""
from __future__ import annotations
import argparse
import copy
import hashlib
import json
from decimal import Decimal, getcontext
from pathlib import Path

getcontext().prec = 50
ROOT = Path(__file__).resolve().parent
SPEC_PATH = ROOT / "convergence" / "mesh-ladders.json"
MESH_DIR = ROOT / "meshes"

def canonical_bytes(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("utf-8")

def sha256(value):
    return "sha256:" + hashlib.sha256(canonical_bytes(value)).hexdigest()

def d(value):
    return Decimal(str(value))

def dec_text(value):
    value = value.normalize()
    text = format(value, "f")
    if "." in text:
        text = text.rstrip("0").rstrip(".")
    return text or "0"

def corner_id(i, j):
    return f"N-C-{i:03d}-{j:03d}"

def edge_key(a, b):
    return tuple(sorted((a, b)))

def signed_area(node_ids, nodes):
    pts = [nodes[node_id] for node_id in node_ids]
    total = Decimal(0)
    for i, left in enumerate(pts):
        right = pts[(i + 1) % len(pts)]
        total += d(left["xOverW"]) * d(right["yOverH"]) - d(right["xOverW"]) * d(left["yOverH"])
    return total / 2

def boundary_sides(x, y):
    sides = []
    if x == 0: sides.append("LEFT")
    if x == 1: sides.append("RIGHT")
    if y == 0: sides.append("BOTTOM")
    if y == 1: sides.append("TOP")
    return sides

def corner_nodes(nx, ny):
    nodes = {}
    one = Decimal(1)
    frac = Decimal("0.08")
    for j in range(ny + 1):
        for i in range(nx + 1):
            x = Decimal(i) / Decimal(nx)
            y = Decimal(j) / Decimal(ny)
            boundary = i in (0, nx) or j in (0, ny)
            if not boundary:
                xm = Decimal(((17 * i + 13 * j) % 5) - 2) / Decimal(2)
                ym = Decimal(((11 * i + 19 * j) % 5) - 2) / Decimal(2)
                x += frac * (one / Decimal(nx)) * xm
                y += frac * (one / Decimal(ny)) * ym
            node_id = corner_id(i, j)
            nodes[node_id] = {
                "nodeId": node_id,
                "kind": "CORNER",
                "logical": {"i": i, "j": j},
                "xOverW": dec_text(x),
                "yOverH": dec_text(y),
                "boundarySides": boundary_sides(x, y),
            }
    return nodes

def orient_triangle(ids, nodes):
    area = signed_area(ids, nodes)
    if area < 0:
        ids = [ids[0], ids[2], ids[1]]
        area = -area
    if area <= 0:
        raise ValueError(f"non-positive triangle area for {ids}")
    return ids, area

def t3_elements(nx, ny, nodes):
    elements = []
    index = 1
    for j in range(ny):
        for i in range(nx):
            p00 = corner_id(i, j)
            p10 = corner_id(i + 1, j)
            p11 = corner_id(i + 1, j + 1)
            p01 = corner_id(i, j + 1)
            tris = (
                [[p00, p10, p11], [p00, p11, p01]]
                if (i + j) % 2 == 0
                else [[p00, p10, p01], [p10, p11, p01]]
            )
            for tri in tris:
                tri, area = orient_triangle(tri, nodes)
                elements.append({
                    "elementId": f"E-{index:04d}",
                    "elementType": "T3",
                    "nodeIds": tri,
                    "orientation": "COUNTER_CLOCKWISE",
                    "signedAreaNormalized": dec_text(area),
                    "cell": {"i": i, "j": j},
                })
                index += 1
    return elements

def midpoint_node(nodes, edge_nodes, edge_to_mid, midside_evidence):
    a, b = edge_key(*edge_nodes)
    key = (a, b)
    if key in edge_to_mid:
        return edge_to_mid[key]
    pa, pb = nodes[a], nodes[b]
    x = (d(pa["xOverW"]) + d(pb["xOverW"])) / 2
    y = (d(pa["yOverH"]) + d(pb["yOverH"])) / 2
    mid_id = f"N-M-{len(edge_to_mid)+1:04d}"
    nodes[mid_id] = {
        "nodeId": mid_id,
        "kind": "MIDSIDE",
        "xOverW": dec_text(x),
        "yOverH": dec_text(y),
        "boundarySides": boundary_sides(x, y),
        "parentEdge": [a, b],
    }
    edge_to_mid[key] = mid_id
    midside_evidence.append({
        "midsideNodeId": mid_id,
        "parentEdgeNodeIds": [a, b],
        "policy": "EXACT_PHYSICAL_MIDPOINT",
    })
    return mid_id

def t6_from_t3(nodes, t3):
    nodes = copy.deepcopy(nodes)
    edge_to_mid = {}
    midside = []
    elements = []
    for row in t3:
        a, b, c = row["nodeIds"]
        m12 = midpoint_node(nodes, (a,b), edge_to_mid, midside)
        m23 = midpoint_node(nodes, (b,c), edge_to_mid, midside)
        m31 = midpoint_node(nodes, (c,a), edge_to_mid, midside)
        elements.append({
            **row,
            "elementType": "T6",
            "nodeIds": [a,b,c,m12,m23,m31],
        })
    return nodes, elements, midside

def q8_elements(nx, ny, nodes):
    nodes = copy.deepcopy(nodes)
    edge_to_mid = {}
    midside = []
    elements = []
    index = 1
    for j in range(ny):
        for i in range(nx):
            p00 = corner_id(i, j)
            p10 = corner_id(i + 1, j)
            p11 = corner_id(i + 1, j + 1)
            p01 = corner_id(i, j + 1)
            corners = [p00,p10,p11,p01]
            area = signed_area(corners, nodes)
            if area <= 0:
                raise ValueError(f"non-positive Q8 corner polygon area cell {i},{j}")
            m12 = midpoint_node(nodes,(p00,p10),edge_to_mid,midside)
            m23 = midpoint_node(nodes,(p10,p11),edge_to_mid,midside)
            m34 = midpoint_node(nodes,(p11,p01),edge_to_mid,midside)
            m41 = midpoint_node(nodes,(p01,p00),edge_to_mid,midside)
            elements.append({
                "elementId": f"E-{index:04d}",
                "elementType":"Q8",
                "nodeIds":[p00,p10,p11,p01,m12,m23,m34,m41],
                "orientation":"COUNTER_CLOCKWISE",
                "signedAreaNormalized": dec_text(area),
                "cell":{"i":i,"j":j},
            })
            index += 1
    return nodes, elements, midside

def topology(nodes, elements):
    adjacency = {node_id:set() for node_id in nodes}
    for e in elements:
        ids = e["nodeIds"]
        for node_id in ids:
            adjacency[node_id].update(other for other in ids if other != node_id)
    remaining = set(adjacency)
    components = []
    while remaining:
        start = min(remaining)
        stack=[start]; seen=set()
        while stack:
            node=stack.pop()
            if node in seen: continue
            seen.add(node)
            stack.extend(adjacency[node] - seen)
        remaining -= seen
        components.append(sorted(seen))
    return {
        "connectedComponentCount": len(components),
        "connectedComponentNodeCounts": [len(c) for c in components],
        "boundaryNodeCount": sum(bool(row["boundarySides"]) for row in nodes.values()),
        "interiorNodeCount": sum(not row["boundarySides"] for row in nodes.values()),
    }

def artifact(family, row):
    nx, ny = row["nx"], row["ny"]
    base_nodes = corner_nodes(nx, ny)
    if family == "T3":
        elements = t3_elements(nx, ny, base_nodes)
        nodes, midside = base_nodes, []
    elif family == "T6":
        t3 = t3_elements(nx, ny, base_nodes)
        nodes, elements, midside = t6_from_t3(base_nodes, t3)
    elif family == "Q8":
        nodes, elements, midside = q8_elements(nx, ny, base_nodes)
    else:
        raise ValueError(family)
    payload = {
        "schema":"lafea-b01-normalized-mesh/v1",
        "meshId":row["meshId"],
        "family":family,
        "coordinateSystem":"NORMALIZED_RECTANGLE_X_OVER_W_Y_OVER_H",
        "nx":nx,
        "ny":ny,
        "expectedElementCount":row["elements"],
        "nodes": sorted(nodes.values(), key=lambda item:item["nodeId"]),
        "elements": elements,
        "midsideParentEdges": sorted(midside, key=lambda item:item["midsideNodeId"]),
        "topologyEvidence": topology(nodes,elements),
        "physicalMaterializationRule":"x = xOverW * case.width; y = yOverH * case.height",
        "sourcePolicy":"validation/lafea-benchmark-data/B01/convergence/mesh-ladders.json",
    }
    if len(elements) != row["elements"]:
        raise AssertionError((row["meshId"], len(elements), row["elements"]))
    if payload["topologyEvidence"]["connectedComponentCount"] != 1:
        raise AssertionError(f"{row['meshId']} disconnected")
    result = dict(payload)
    result["meshSemanticHash"] = sha256(payload)
    return result

def compact_artifact(family, row):
    verbose = artifact(family, row)
    compact = {
        "meshId": verbose["meshId"],
        "family": verbose["family"],
        "nx": verbose["nx"],
        "ny": verbose["ny"],
        "nodes": [
            [
                node["nodeId"],
                node["xOverW"],
                node["yOverH"],
                node["boundarySides"],
                *([node["parentEdge"]] if "parentEdge" in node else []),
            ]
            for node in verbose["nodes"]
        ],
        "elements": [
            [element["elementId"], element["nodeIds"]]
            for element in verbose["elements"]
        ],
        "midsides": [
            [row["midsideNodeId"], *row["parentEdgeNodeIds"]]
            for row in verbose["midsideParentEdges"]
        ],
        "topology": verbose["topologyEvidence"],
    }
    compact["meshSemanticHash"] = sha256(compact)
    return compact

SUMMARY_PATH = MESH_DIR / "mesh-generation-summary.json"

def generate_meshes():
    spec = json.loads(SPEC_PATH.read_text())
    meshes = []
    for family, rows in spec["logicalLadders"].items():
        for row in rows:
            meshes.append(compact_artifact(family, row))
    return meshes

def generation_summary(meshes):
    return {
        "schema": "lafea-b01-mesh-generation-summary/v1",
        "sourcePolicy": "validation/lafea-benchmark-data/B01/convergence/mesh-ladders.json",
        "generator": "validation/lafea-benchmark-data/B01/mesh-generator.py",
        "meshCount": len(meshes),
        "meshes": [
            {
                "meshId": mesh["meshId"],
                "family": mesh["family"],
                "meshSemanticHash": mesh["meshSemanticHash"],
                "nodeCount": len(mesh["nodes"]),
                "elementCount": len(mesh["elements"]),
                "midsideNodeCount": len(mesh["midsides"]),
                "connectedComponentCount": mesh["topology"]["connectedComponentCount"],
            }
            for mesh in meshes
        ],
        "retentionPolicy": "The registered-route execution receipt retains the full physical node coordinates, element connectivity, midside parent edges, topology evidence and both normalized/physical mesh hashes for every run.",
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--emit", action="store_true")
    parser.add_argument("--family", choices=["T3", "T6", "Q8"])
    parser.add_argument("--mesh")
    parser.add_argument("--write-summary", action="store_true")
    args = parser.parse_args()

    meshes = generate_meshes()
    if args.emit:
        if not args.family or not args.mesh:
            raise SystemExit("--emit requires --family and --mesh")
        matches = [
            mesh for mesh in meshes
            if mesh["family"] == args.family and mesh["meshId"] == args.mesh
        ]
        if len(matches) != 1:
            raise SystemExit(f"Unknown mesh {args.family}/{args.mesh}")
        print(json.dumps(matches[0], separators=(",", ":"), ensure_ascii=True))
        return

    summary = generation_summary(meshes)
    summary_text = json.dumps(summary, indent=2) + "\n"

    if args.write_summary:
        MESH_DIR.mkdir(parents=True, exist_ok=True)
        SUMMARY_PATH.write_text(summary_text)
        print(json.dumps({"status": "WROTE", "meshCount": len(meshes), "path": str(SUMMARY_PATH)}))
        return

    if args.check:
        replay = generate_meshes()
        if canonical_bytes(meshes) != canonical_bytes(replay):
            raise SystemExit("B01 mesh generation is not byte-deterministic across replay")
        if not SUMMARY_PATH.exists() or SUMMARY_PATH.read_text() != summary_text:
            raise SystemExit("B01 mesh generation summary does not match frozen generator output")
        print(json.dumps({"status": "PASS", "meshCount": len(meshes), "deterministicReplay": True}))
        return

    print(summary_text, end="")

if __name__ == "__main__":
    main()
