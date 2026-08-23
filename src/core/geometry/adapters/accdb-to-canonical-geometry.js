import { CANONICAL_GEOMETRY_SCHEMA_VERSION } from '../geometryTypes.js';
import {
  ACCDB_RESTRAINT_TYPE_CODES_WITH_EVIDENCE,
  accdbRestraintTypeCorrespondence,
} from './accdb-restraint-type-correspondence.js';
import { validateCanonicalGeometry } from '../validateCanonicalGeometry.js';
import { checkDeclaredRadius, resolveBendArcCentre } from './inputxml-bend-arc.js';
import { convertCaesarValue, temperatureToKelvin } from '../../fea-benchmarks/caesar-accdb-units.js';
import { add, dot, norm, scale, subtract } from '../../shared-analysis-contract/vector3.js';

/**
 * CAESAR II ACCDB model tables to canonical geometry plus traceable
 * analysis-source metadata, mirroring inputXmlToCanonicalGeometry.js's
 * shape and null-handling convention field for field. Unlike InputXML,
 * <UNITS> is not optional here: INPUT_UNITS is one of the required
 * MODEL_TABLES a caller must have supplied before reaching this adapter,
 * so there is no options.unit fallback to accept.
 *
 * Scope boundary: this produces geometry, not a solve. Bend/tee/reducer
 * discretization into multiple stiffness elements (compilePipingComponent,
 * discretiseBend, B31 factor calculation) is solve-layer work that belongs
 * downstream of this adapter's output, exactly as it does for InputXML —
 * a bend is one segment here, the same way it is one PIPINGELEMENT/BEND
 * segment in inputXmlToCanonicalGeometry.js.
 */
export function accdbTablesToCanonicalGeometry(tables, options = {}) {
  requireModelTables(tables);
  const diagnostics = [];
  const source = options.source || 'accdb';
  const units = resolveAccdbUnitSystem(tables.INPUT_UNITS.rows, diagnostics);

  const elementRows = sortedByElementId(tables.INPUT_BASIC_ELEMENT_DATA.rows);
  const positions = buildAccdbNodePositions(tables.INPUT_NODAL_COORDINATES.rows, units.length, diagnostics);
  const bendsByPointer = indexByPointer(tables.INPUT_BENDS.rows, 'BEND_PTR');
  const rigidsByPointer = indexByPointer(tables.INPUT_RIGIDS.rows, 'RIGID_PTR');
  const reducersByPointer = indexByPointer(tables.INPUT_REDUCERS.rows, 'RED_PTR');
  const forcmntByPointer = groupByField(tables.INPUT_FORCMNT.rows, 'FORCMNT_PTR');
  const sifsByNode = groupByField(tables.INPUT_SIFTEES.rows, 'NODE');
  const restraintsByNode = groupByField(tables.INPUT_RESTRAINTS.rows, 'NODE_NUM');

  const nodesById = new Map();
  const ensureNode = (nodeId) => {
    if (!nodesById.has(nodeId)) {
      const point = positions.get(nodeId);
      nodesById.set(nodeId, {
        id: nodeId,
        x: point ? point.x : null,
        y: point ? point.y : null,
        z: point ? point.z : null,
        restraint: 'FREE',
        meta: { accdbNodeNumber: nodeId },
      });
    }
    return nodesById.get(nodeId);
  };

  const carry = Object.create(null);
  const segments = [];
  for (const row of elementRows) {
    const sourceElementId = String(row.ELEMENTID);
    const fromNode = cleanNodeId(row.FROM_NODE);
    const toNode = cleanNodeId(row.TO_NODE);
    if (!fromNode || !toNode) {
      addDiagnostic(diagnostics, 'error', 'ACCDB_ELEMENT_NODE_MISSING', `Element ${sourceElementId} is missing FROM_NODE or TO_NODE.`, { sourceElementId });
      continue;
    }
    ensureNode(fromNode);
    ensureNode(toNode);

    const bendPointer = accdbNumberOrNull(row.BEND_PTR);
    const reducerPointer = accdbNumberOrNull(row.REDUCER_PTR);
    const rigidPointer = accdbNumberOrNull(row.RIGID_PTR);
    const offsetPointer = accdbNumberOrNull(row.EOFF_PTR);
    if (offsetPointer != null && offsetPointer > 0) {
      addDiagnostic(
        diagnostics, 'error', 'ACCDB_ELEMENT_OFFSET_NOT_SUPPORTED',
        `Element ${sourceElementId} declares EOFF_PTR ${offsetPointer}; a declared element offset changes true endpoint geometry and is not represented by this adapter.`,
        { sourceElementId, offsetPointer },
      );
    }

    let rigidDeclaration = null;
    if (rigidPointer != null && rigidPointer > 0) {
      rigidDeclaration = requirePointer(rigidsByPointer, rigidPointer, 'RIGID', sourceElementId);
    }
    let reducerGeometry = null;
    if (reducerPointer != null && reducerPointer > 0) {
      const declaration = requirePointer(reducersByPointer, reducerPointer, 'REDUCER', sourceElementId);
      reducerGeometry = resolveAccdbReducerGeometry(row, declaration, elementRows, units.length);
    }

    const sifRows = [...(sifsByNode.get(fromNode) ?? []), ...(sifsByNode.get(toNode) ?? [])];
    const type = classifyAccdbSegmentType(rigidDeclaration, reducerGeometry, sifRows, bendPointer != null && bendPointer > 0, diagnostics, sourceElementId);

    const diameter = inheritedAccdbLengthField(row, 'DIAMETER', carry, 'diameter', units.length, diagnostics, sourceElementId);
    const thickness = inheritedAccdbLengthField(row, 'WALL_THICK', carry, 'thickness', units.length, diagnostics, sourceElementId);
    const material = inheritedAccdbStringField(row, 'MATERIAL_NAME', carry, 'material');

    const segment = {
      id: `ACCDB.E${sourceElementId}`,
      startNodeId: fromNode,
      endNodeId: toNode,
      type,
      sourceComponentUid: `ACCDB-SOURCE-E${sourceElementId}`,
      length: null,
      diameter: diameter ?? undefined,
      thickness: thickness ?? undefined,
      material: material ?? undefined,
      meta: {
        materialNumber: accdbNumberOrNull(row.MATERIAL_NUM),
        sourceType: type,
        sourceElementId,
        analysis: analysisMetadataForRow(row, carry, units, diagnostics, sourceElementId),
      },
    };

    if (reducerGeometry) segment.meta.reducer = reducerGeometry;
    if (rigidDeclaration) {
      segment.meta.analysis.rigid = {
        type: rigidDeclaration.RIGID_TYPE ?? null,
        weight: convertOrNull(accdbNumberOrNull(rigidDeclaration.RIGID_WGT), units.force, 'FORCE', diagnostics, sourceElementId, 'RIGID_WGT'),
      };
    }
    const classifiedSifs = sifRows
      .map((sifRow) => ({
        nodeId: cleanNodeId(sifRow.NODE),
        typeCode: accdbNumberOrNull(sifRow.TYPE),
        inPlane: accdbNumberOrNull(sifRow.SIF_IN),
        outOfPlane: accdbNumberOrNull(sifRow.SIF_OUT),
      }));
    if (classifiedSifs.length > 0) {
      segment.meta.analysis.sifs = classifiedSifs;
      const unclassified = classifiedSifs.filter((sif) => sif.typeCode !== SIF_TYPE_WELDING_TEE && sif.typeCode !== SIF_TYPE_WELDOLET);
      if (unclassified.length > 0) {
        addDiagnostic(
          diagnostics, 'info', 'ACCDB_SIF_TYPE_UNCLASSIFIED',
          `Element ${sourceElementId} carries INPUT_SIFTEES TYPE code(s) [${unclassified.map((s) => s.typeCode).join(', ')}] not recognized as welding-tee (3) or weldolet (5); retained as evidence, not used for segment classification.`,
          { sourceElementId, unclassified },
        );
      }
    }
    const forcesMoments = (forcmntByPointer.get(accdbNumberOrNull(row.FORCMNT_PTR)) ?? [])
      .map((vector) => ({
        forceMomentNumber: accdbNumberOrNull(vector.FORCMNT_NUM),
        vectorNumber: accdbNumberOrNull(vector.VECTOR_NUM),
        force: {
          fx: convertOrNull(accdbNumberOrNull(vector.FX), units.force, 'FORCE', diagnostics, sourceElementId, 'FX'),
          fy: convertOrNull(accdbNumberOrNull(vector.FY), units.force, 'FORCE', diagnostics, sourceElementId, 'FY'),
          fz: convertOrNull(accdbNumberOrNull(vector.FZ), units.force, 'FORCE', diagnostics, sourceElementId, 'FZ'),
        },
        moment: {
          mx: convertOrNull(accdbNumberOrNull(vector.MX), units.moment, 'MOMENT', diagnostics, sourceElementId, 'MX'),
          my: convertOrNull(accdbNumberOrNull(vector.MY), units.moment, 'MOMENT', diagnostics, sourceElementId, 'MY'),
          mz: convertOrNull(accdbNumberOrNull(vector.MZ), units.moment, 'MOMENT', diagnostics, sourceElementId, 'MZ'),
        },
      }));
    if (forcesMoments.length > 0) {
      segment.meta.analysis.forcesMoments = forcesMoments;
      addDiagnostic(
        diagnostics, 'warn', 'ACCDB_FORCES_MOMENTS_PRESENT_NOT_COMPILED',
        `Element ${sourceElementId} carries ${forcesMoments.length} INPUT_FORCMNT vector(s); retained as evidence, but no external nodal load is applied by geometry ingestion.`,
        { sourceElementId, forcesMoments },
      );
    }

    if (bendPointer != null && bendPointer > 0) {
      const declaration = requirePointer(bendsByPointer, bendPointer, 'BEND', sourceElementId);
      attachAccdbBendGeometry(segment, row, declaration, elementRows, positions, units.length, diagnostics);
    }

    segments.push(segment);
  }

  for (const [nodeId, rows] of restraintsByNode) {
    const node = nodesById.get(nodeId);
    if (!node) {
      addDiagnostic(diagnostics, 'warn', 'ACCDB_RESTRAINT_NODE_UNRESOLVED', `INPUT_RESTRAINTS references node ${nodeId}, which is not an element endpoint.`, { nodeId });
      continue;
    }
    for (const row of rows) {
      attachAccdbRestraint(node, row, diagnostics);
    }
  }

  const nodes = [...nodesById.values()].map((node) => finalizeAccdbNode(node, diagnostics));
  segments.forEach((segment) => {
    const start = nodesById.get(segment.startNodeId);
    const end = nodesById.get(segment.endNodeId);
    if (start.x != null && end.x != null) segment.length = distance(start, end);
  });

  const control = tables.INPUT_CONTROL.rows[0];
  if (control) {
    const declaredElementCount = accdbNumberOrNull(control.NUMELT);
    if (declaredElementCount != null && declaredElementCount !== elementRows.length) {
      addDiagnostic(
        diagnostics, 'warn', 'ACCDB_ELEMENT_COUNT_MISMATCH',
        `INPUT_CONTROL declares NUMELT=${declaredElementCount} but INPUT_BASIC_ELEMENT_DATA has ${elementRows.length} row(s).`,
        { declaredElementCount, actualElementCount: elementRows.length },
      );
    }
  }

  const geometry = {
    schemaVersion: CANONICAL_GEOMETRY_SCHEMA_VERSION,
    nodes,
    segments,
    source,
    unit: 'm',
    diagnostics: [],
    summary: {
      componentCount: elementRows.length,
      nodeCount: nodes.length,
      segmentCount: segments.length,
      accdbUnits: units.declared,
    },
  };
  const validation = validateCanonicalGeometry(geometry, { tolerance: options.tolerance, requireKnownUnit: false });
  geometry.diagnostics = [...diagnostics, ...validation.diagnostics];
  geometry.summary = { ...geometry.summary, ...validation.summary };
  geometry.valid = validation.ok && !diagnostics.some((row) => String(row.severity).toLowerCase() === 'error');
  return geometry;
}

const ACCDB_BLANK_SENTINEL = -1.01010000705719;
const ACCDB_SENTINEL_TOLERANCE = 0.001;
const SIF_TYPE_WELDING_TEE = 3;
const SIF_TYPE_WELDOLET = 5;
const POSITION_TOLERANCE_M = 1e-7;

const MODEL_TABLE_NAMES = Object.freeze([
  'INPUT_BASIC_ELEMENT_DATA', 'INPUT_BENDS', 'INPUT_CONTROL', 'INPUT_FORCMNT',
  'INPUT_NODAL_COORDINATES', 'INPUT_OFFSETS', 'INPUT_REDUCERS', 'INPUT_RESTRAINTS',
  'INPUT_RIGIDS', 'INPUT_SIFTEES', 'INPUT_UNITS',
]);

function requireModelTables(tables) {
  const missing = MODEL_TABLE_NAMES.filter((name) => !tables?.[name] || !Array.isArray(tables[name].rows));
  if (missing.length > 0) throw new TypeError(`accdbTablesToCanonicalGeometry requires tables: ${missing.join(', ')}.`);
}

function resolveAccdbUnitSystem(unitsRows, diagnostics) {
  if (unitsRows.length !== 1) throw new TypeError(`INPUT_UNITS must declare exactly one row; found ${unitsRows.length}.`);
  const declared = unitsRows[0];
  return {
    declared: {
      length: declared.LENGTH, force: declared.FORCE, moment: declared.MOMENT_IN,
      stress: declared.STRESS, temp: declared.TEMP, pressure: declared.PRESSURE,
      emodulus: declared.EMODULUS, pipeDensity: declared.PIPE_DENSITY,
      insulDensity: declared.INSUL_DENSITY, fluidDensity: declared.FLUID_DENSITY,
    },
    length: dimensionConverter('LENGTH', declared.LENGTH, diagnostics),
    force: dimensionConverter('FORCE', declared.FORCE, diagnostics),
    moment: dimensionConverter('MOMENT', declared.MOMENT_IN, diagnostics),
    stress: dimensionConverter('STRESS', declared.STRESS, diagnostics),
    emodulus: dimensionConverter('STRESS', declared.EMODULUS, diagnostics),
    pressure: dimensionConverter('STRESS', declared.PRESSURE, diagnostics),
    pipeDensity: dimensionConverter('DENSITY', declared.PIPE_DENSITY, diagnostics),
    insulDensity: dimensionConverter('DENSITY', declared.INSUL_DENSITY, diagnostics),
    fluidDensity: dimensionConverter('DENSITY', declared.FLUID_DENSITY, diagnostics),
    temp: (rawValue) => temperatureToKelvin(rawValue, declared.TEMP),
  };
}

/**
 * Resolve one dimension's converter once (INPUT_UNITS is a single model-wide
 * row), recording exactly one diagnostic for an unsupported token rather
 * than one per element/field that touches it.
 */
function dimensionConverter(dimension, rawUnit, diagnostics) {
  let warned = false;
  return (rawValue) => {
    try {
      return convertCaesarValue(rawValue, rawUnit, dimension).value;
    } catch (error) {
      if (!warned) {
        warned = true;
        addDiagnostic(
          diagnostics, 'error', 'ACCDB_UNIT_TOKEN_UNSUPPORTED',
          error instanceof Error ? error.message : String(error),
          { dimension, rawUnit },
        );
      }
      return null;
    }
  };
}

function convertOrNull(value, converter, quantity, diagnostics, sourceElementId, label) {
  if (value == null) return null;
  const converted = converter(value);
  if (converted == null) {
    addDiagnostic(diagnostics, 'error', 'ACCDB_UNIT_DECLARATION_REQUIRED', `Element ${sourceElementId} field ${label} could not be converted (${quantity}).`, { sourceElementId, label, quantity });
  }
  return converted;
}

function buildAccdbNodePositions(rows, lengthConvert, diagnostics) {
  const positions = new Map();
  const setNode = (rawId, x, y, z) => {
    const id = cleanNodeId(rawId);
    if (!id || x == null || y == null || z == null) return;
    const point = { x: lengthConvert(x), y: lengthConvert(y), z: lengthConvert(z) };
    const existing = positions.get(id);
    if (existing) {
      const delta = Math.hypot(point.x - existing.x, point.y - existing.y, point.z - existing.z);
      if (delta > POSITION_TOLERANCE_M) throw new TypeError(`ACCDB node ${id} has inconsistent coordinates.`);
      return;
    }
    positions.set(id, point);
  };
  for (const row of rows) {
    setNode(row.FROM_NODE, accdbNumberOrNull(row.FROM_NODE_X), accdbNumberOrNull(row.FROM_NODE_Y), accdbNumberOrNull(row.FROM_NODE_Z));
    setNode(row.TO_NODE, accdbNumberOrNull(row.TO_NODE_X), accdbNumberOrNull(row.TO_NODE_Y), accdbNumberOrNull(row.TO_NODE_Z));
  }
  return positions;
}

function indexByPointer(rows, pointerField) {
  const map = new Map();
  for (const row of rows) {
    const pointer = accdbNumberOrNull(row[pointerField]);
    if (pointer != null) map.set(pointer, row);
  }
  return map;
}

function groupByField(rows, field) {
  const map = new Map();
  for (const row of rows) {
    const key = field === 'NODE' || field === 'NODE_NUM' ? cleanNodeId(row[field]) : accdbNumberOrNull(row[field]);
    if (key == null || key === '') continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

function requirePointer(map, pointer, kind, sourceElementId) {
  const value = map.get(pointer);
  if (!value) throw new TypeError(`Element ${sourceElementId} references ${kind}_PTR ${pointer}, which has no INPUT_${kind}S declaration.`);
  return value;
}

function sortedByElementId(rows) {
  return [...rows].sort((left, right) => Number(left.ELEMENTID) - Number(right.ELEMENTID));
}

function classifyAccdbSegmentType(rigidDeclaration, reducerGeometry, sifRows, hasBend, diagnostics, sourceElementId) {
  const rigidType = String(rigidDeclaration?.RIGID_TYPE ?? '').toUpperCase();
  if (rigidType.includes('VALVE')) return 'VALVE';
  if (rigidType.includes('FLANGE') || rigidType.includes('BLIND') || rigidType.includes('GASK')) return 'FLANGE';
  if (reducerGeometry) return 'PIPE';
  for (const sifRow of sifRows) {
    const typeCode = accdbNumberOrNull(sifRow.TYPE);
    if (typeCode === SIF_TYPE_WELDING_TEE || typeCode === SIF_TYPE_WELDOLET) return 'TEE';
  }
  if (hasBend) return 'BEND';
  return 'PIPE';
}

function inheritedAccdbLengthField(row, attribute, carry, key, lengthConvert, diagnostics, sourceElementId) {
  const raw = accdbNumberOrNull(row[attribute]);
  if (raw != null) {
    const value = lengthConvert(raw);
    carry[key] = value;
    return value;
  }
  if (carry[key] != null) return carry[key];
  return null;
}

function inheritedAccdbStringField(row, attribute, carry, key) {
  const raw = row[attribute];
  const own = raw != null && String(raw).trim() !== '' ? String(raw).trim() : null;
  if (own) {
    carry[key] = own;
    return own;
  }
  return carry[key] ?? null;
}

function analysisMetadataForRow(row, carry, units, diagnostics, sourceElementId) {
  const inherit = (attribute, key, converter, quantity) => {
    const raw = accdbNumberOrNull(row[attribute]);
    if (raw != null) {
      const value = converter(raw);
      if (value == null) {
        addDiagnostic(diagnostics, 'error', 'ACCDB_UNIT_DECLARATION_REQUIRED', `Element ${sourceElementId} field ${attribute} could not be converted (${quantity}).`, { sourceElementId, field: attribute, quantity });
        return null;
      }
      carry[key] = value;
      return value;
    }
    if (carry[key] != null) {
      addDiagnostic(diagnostics, 'info', `${attribute}_INHERITED_FROM_PRIOR_ELEMENT`, `Element ${sourceElementId} has no ${attribute}; inherited ${carry[key]} from the prior element.`, { sourceElementId, value: carry[key] });
      return carry[key];
    }
    return null;
  };
  return {
    elasticModulus: inherit('MODULUS', 'elasticModulus', units.emodulus, 'EMODULUS'),
    poissonRatio: inherit('POISSONS', 'poissonRatio', (value) => value, 'DIMENSIONLESS'),
    operatingTemperature: inherit('TEMP_EXP_C1', 'operatingTemperature', units.temp, 'TEMP'),
    operatingTemperature2: inherit('TEMP_EXP_C2', 'operatingTemperature2', units.temp, 'TEMP'),
    pressure: inherit('PRESSURE1', 'pressure', units.pressure, 'PRESSURE'),
    hydroPressure: inherit('HYDRO_PRESSURE', 'hydroPressure', units.pressure, 'PRESSURE'),
    fluidDensity: inherit('FLUID_DENSITY', 'fluidDensity', units.fluidDensity, 'FDENS'),
    pipeDensity: inherit('PIPE_DENSITY', 'pipeDensity', units.pipeDensity, 'PDENS'),
    insulationThickness: inherit('INSUL_THICK', 'insulationThickness', units.length, 'LENGTH'),
    insulationDensity: inherit('INSUL_DENSITY', 'insulationDensity', units.insulDensity, 'IDENS'),
    corrosionAllowance: inherit('CORR_ALLOW', 'corrosionAllowance', units.length, 'LENGTH'),
  };
}

function resolveAccdbReducerGeometry(row, declaration, elementRows, lengthConvert) {
  const outerDiameter = lengthConvert(accdbNumberOrNull(declaration.DIAMETER2));
  let wallThickness = accdbNumberOrNull(declaration.THICKNESS2);
  wallThickness = wallThickness != null ? lengthConvert(wallThickness) : null;
  if (!(wallThickness > 0)) {
    const candidates = elementRows.filter((candidate) => {
      if (String(candidate.FROM_NODE) !== String(row.TO_NODE)) return false;
      const candidateDiameter = accdbNumberOrNull(candidate.DIAMETER);
      if (candidateDiameter == null) return false;
      return Math.abs(lengthConvert(candidateDiameter) - outerDiameter) <= POSITION_TOLERANCE_M;
    });
    if (candidates.length !== 1) throw new TypeError(`Reducer on element ${row.ELEMENTID} cannot resolve its outlet wall thickness.`);
    wallThickness = lengthConvert(accdbNumberOrNull(candidates[0].WALL_THICK));
  }
  return {
    toOuterDiameter: outerDiameter,
    toWallThickness: wallThickness,
    // ALPHA is an angle, so it carries no length unit to convert.
    alpha: accdbNumberOrNull(declaration.ALPHA),
    // R1/R2 are retained exactly as the file states them, in the file's own
    // length unit -- this adapter has no confirmed reading of what CAESAR
    // measures them between, and converting on an assumption would put a
    // silently mis-scaled length next to the two genuinely converted ones
    // above. The names say which units they are in so no reader can mistake
    // them for the metres the rest of this record is in; no mechanics
    // consumes them today.
    r1SourceUnits: accdbNumberOrNull(declaration.R1),
    r2SourceUnits: accdbNumberOrNull(declaration.R2),
  };
}

function attachAccdbBendGeometry(segment, row, declaration, elementRows, positions, lengthConvert, diagnostics) {
  const sourceElementId = segment.meta.sourceElementId;
  const declaredRadius = lengthConvert(accdbNumberOrNull(declaration.RADIUS));
  segment.meta.bendDeclaredRadius = declaredRadius ?? undefined;
  segment.meta.bendAngle1 = accdbNumberOrNull(declaration.ANGLE1) ?? undefined;
  segment.meta.bendAngle2 = accdbNumberOrNull(declaration.ANGLE2) ?? undefined;
  segment.meta.numMiter = accdbNumberOrNull(declaration.NUM_MITER) ?? undefined;
  segment.meta.bendStationNode1 = validStationNode(declaration.NODE1) ? String(declaration.NODE1) : undefined;
  segment.meta.bendStationNode2 = validStationNode(declaration.NODE2) ? String(declaration.NODE2) : undefined;

  const isCompound = (segment.meta.bendAngle2 != null && segment.meta.bendAngle2 !== 0)
    || (segment.meta.numMiter != null && segment.meta.numMiter > 1);
  segment.meta.bendCompoundMiter = isCompound || undefined;

  if (declaredRadius == null) {
    addDiagnostic(diagnostics, 'warn', 'ACCDB_BEND_ARC_GEOMETRY_NOT_DECLARED', `Bend segment ${segment.id} has no declared RADIUS.`, { segmentId: segment.id });
    return;
  }
  if (isCompound) {
    addDiagnostic(diagnostics, 'warn', 'ACCDB_BEND_COMPOUND_MITER_NOT_SUPPORTED', `Bend segment ${segment.id} is a compound multi-cut miter; one circle cannot represent it.`, { segmentId: segment.id });
    return;
  }

  const outgoing = elementRows.filter((candidate) => String(candidate.FROM_NODE) === String(row.TO_NODE));
  if (outgoing.length !== 1) {
    addDiagnostic(diagnostics, 'warn', 'ACCDB_BEND_ARC_GEOMETRY_NOT_DECLARED', `Bend segment ${segment.id} does not have exactly one outgoing element from node ${row.TO_NODE}; found ${outgoing.length}.`, { segmentId: segment.id, outgoingCount: outgoing.length });
    return;
  }
  // ACCDB's own convention, unlike InputXML's: TO_NODE of a bend-pointered
  // element is the theoretical straight-leg intersection point, not a
  // tangent point. The real tangent points have to be derived from that
  // intersection using the declared radius (mirrors
  // caesar-accdb-linear-solve.js's buildBendDefinitions arc math exactly,
  // the one real precedent for this in the codebase) before an arc centre
  // can be resolved at all.
  const start = positions.get(cleanNodeId(row.FROM_NODE));
  const intersection = positions.get(cleanNodeId(row.TO_NODE));
  const outletEnd = positions.get(cleanNodeId(outgoing[0].TO_NODE));
  if (!start || !intersection || !outletEnd) return;
  const incomingLength = distance(start, intersection);
  const outgoingLength = distance(intersection, outletEnd);
  if (!(incomingLength > 0) || !(outgoingLength > 0)) return;
  const incomingDirection = scale(subtract(intersection, start), 1 / incomingLength);
  const outgoingDirection = scale(subtract(outletEnd, intersection), 1 / outgoingLength);
  const bendAngle = Math.acos(Math.min(1, Math.max(-1, dot(incomingDirection, outgoingDirection))));
  if (!(bendAngle > 0 && bendAngle < Math.PI)) {
    addDiagnostic(diagnostics, 'warn', 'ACCDB_BEND_ARC_GEOMETRY_NOT_DECLARED', `Bend segment ${segment.id} has an invalid or degenerate bend angle.`, { segmentId: segment.id, bendAngle });
    return;
  }
  const tangentLength = declaredRadius * Math.tan(bendAngle / 2);
  if (!(tangentLength < incomingLength) || !(tangentLength < outgoingLength)) {
    addDiagnostic(diagnostics, 'warn', 'ACCDB_BEND_ARC_GEOMETRY_NOT_DECLARED', `Bend segment ${segment.id} declared RADIUS ${declaredRadius} produces a tangent length that overruns an adjacent span.`, { segmentId: segment.id, tangentLength, incomingLength, outgoingLength });
    return;
  }
  const tangentStart = subtract(intersection, scale(incomingDirection, tangentLength));
  const tangentEnd = add(intersection, scale(outgoingDirection, tangentLength));
  const resolved = resolveBendArcCentre(incomingDirection, tangentStart, tangentEnd);
  if (!resolved) {
    addDiagnostic(diagnostics, 'warn', 'ACCDB_BEND_ARC_GEOMETRY_NOT_DECLARED', `Bend segment ${segment.id} geometry is degenerate; could not resolve an arc centre.`, { segmentId: segment.id });
    return;
  }
  // By construction, tangentStart/tangentEnd were derived using the
  // declared radius, so this is a self-consistency check on the geometry
  // arithmetic above, not an independent validation of the declared value
  // the way it is for InputXML (whose FROM/TO_NODE pair on a bend element
  // already are the tangent points, letting radius be derived with no
  // prior assumption about it).
  const check = checkDeclaredRadius(resolved.computedRadius, declaredRadius, 1e-6);
  if (!check.accepted) {
    addDiagnostic(
      diagnostics, 'error', 'ACCDB_BEND_ARC_SELF_CONSISTENCY_FAILED',
      `Bend segment ${segment.id} arc centre resolution is internally inconsistent (computed radius ${resolved.computedRadius} vs. declared ${declaredRadius}); this indicates a geometry computation defect, not a source-data issue.`,
      { segmentId: segment.id, ...check },
    );
    return;
  }
  segment.meta.bendArcCentre = resolved.centre;
  segment.meta.bendComputedRadius = resolved.computedRadius;
  segment.meta.bendTangentStart = { ...tangentStart };
  segment.meta.bendTangentEnd = { ...tangentEnd };
  segment.meta.bendTangentBasis = 'ACCDB_CORNER_INTERSECTION_V1';
  addDiagnostic(diagnostics, 'info', 'ACCDB_BEND_ARC_GEOMETRY_RESOLVED', `Bend segment ${segment.id} arc centre resolved from exact ACCDB nodal coordinates and declared radius.`, { segmentId: segment.id });
}

function attachAccdbRestraint(node, row, diagnostics) {
  const type = accdbNumberOrNull(row.RES_TYPEID);
  const restraints = node.meta.restraints || (node.meta.restraints = []);
  // ACCDB's RES_TYPEID is a different enumeration from InputXML's TYPE (they
  // disagree on GUI vs LIM, among others), so the raw code is translated
  // through the evidenced correspondence rather than passed on as if the two
  // numbering schemes matched. See accdb-restraint-type-correspondence.js.
  const correspondence = accdbRestraintTypeCorrespondence(type);
  const gap = accdbNumberOrNull(row.GAP);
  const frictionCoefficient = accdbNumberOrNull(row.FRIC_COEF);
  const connectedNode = accdbNumberOrNull(row.CNODE);
  const dominantDof = correspondence?.conditioningClass === 'ANCHOR' ? null : dominantTranslationDof(row, node.id);
  restraints.push({
    resTypeId: type,
    // The vocabulary every downstream reader already speaks: the corrected
    // type code, the raw ACCDB code it came from, and the label CAESAR's own
    // reports print for it.
    sourceTypeCode: correspondence?.sourceTypeCode ?? null,
    typeCode: correspondence?.typeCode ?? null,
    typeLabel: correspondence?.typeLabel ?? null,
    xCosine: accdbNumberOrNull(row.XCOSINE),
    yCosine: accdbNumberOrNull(row.YCOSINE),
    zCosine: accdbNumberOrNull(row.ZCOSINE),
    dominantDirection: dominantDof,
    stiffness: accdbNumberOrNull(row.STIFFNESS),
    gap,
    frictionCoefficient,
    connectedNode,
    resTag: row.RES_TAG ?? null,
  });
  if (connectedNode != null) {
    addDiagnostic(
      diagnostics, 'error', 'ACCDB_RESTRAINT_CONNECTED_NODE_NOT_SUPPORTED',
      `Restraint at node ${node.id} declares CNODE ${connectedNode}; a connected-node restraint changes the physical restraint target and is not represented by this adapter.`,
      { nodeId: node.id, connectedNode },
    );
  }
  if (gap != null) {
    addDiagnostic(diagnostics, 'warn', 'ACCDB_RESTRAINT_GAP_NOT_MODELED', `Restraint at node ${node.id} declares a nonzero GAP; retained as evidence, not modeled as a nonlinear gap by geometry ingestion.`, { nodeId: node.id, gap });
  }
  if (frictionCoefficient != null) {
    addDiagnostic(diagnostics, 'warn', 'ACCDB_RESTRAINT_FRICTION_NOT_MODELED', `Restraint at node ${node.id} declares a friction coefficient; retained as evidence, not modeled by geometry ingestion.`, { nodeId: node.id, frictionCoefficient });
  }
  if (correspondence === null) {
    // An unrecognized restraint kind is not a detail to carry as evidence and
    // move past: an omitted or misread support changes the load path and every
    // reaction downstream of it. Fail closed and say which code needs
    // evidence.
    addDiagnostic(
      diagnostics, 'error', 'ACCDB_RESTRAINT_TYPE_UNMAPPED',
      `Restraint at node ${node.id} declares RES_TYPEID ${String(type)}, which has no evidenced correspondence to a CAESAR restraint type. Add it from a paired export rather than assuming the InputXML numbering.`,
      { nodeId: node.id, resTypeId: type, codesWithEvidence: ACCDB_RESTRAINT_TYPE_CODES_WITH_EVIDENCE },
    );
    if (node.restraint === 'FREE') node.restraint = 'UNKNOWN';
    return;
  }
  if (correspondence.conditioningClass === 'ANCHOR') {
    node.restraint = 'ANCHOR';
  } else if (correspondence.conditioningClass !== null) {
    // A node already anchored stays anchored: an anchor is the stronger
    // condition, and a guide declared at the same node cannot relax it.
    if (node.restraint !== 'ANCHOR') node.restraint = correspondence.conditioningClass;
  } else if (node.restraint === 'FREE') {
    node.restraint = 'UNKNOWN';
  }
}

function dominantTranslationDof(row, nodeId) {
  const values = [accdbNumberOrNull(row.XCOSINE), accdbNumberOrNull(row.YCOSINE), accdbNumberOrNull(row.ZCOSINE)].map((value) => Math.abs(value ?? 0));
  const maximum = Math.max(...values);
  if (!(maximum > 0)) return null;
  return ['UX', 'UY', 'UZ'][values.indexOf(maximum)];
}

function finalizeAccdbNode(node, diagnostics) {
  if (node.x == null) {
    addDiagnostic(diagnostics, 'error', 'ACCDB_NODE_COORDINATE_UNRESOLVED', `Node ${node.id} could not be resolved to a coordinate from INPUT_NODAL_COORDINATES.`, { nodeId: node.id });
  }
  return node;
}

function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
}

function validStationNode(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0;
}

function cleanNodeId(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const numeric = Number(text);
  return Number.isFinite(numeric) ? String(numeric) : text;
}

function accdbNumberOrNull(value) {
  if (value == null || value === '') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  if (Math.abs(numeric - ACCDB_BLANK_SENTINEL) < ACCDB_SENTINEL_TOLERANCE) return null;
  return numeric;
}

function addDiagnostic(diagnostics, severity, code, message, data = {}) {
  diagnostics.push({ severity, code, message, data });
}