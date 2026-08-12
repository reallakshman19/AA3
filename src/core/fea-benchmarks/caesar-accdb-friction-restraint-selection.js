/**
 * Source-custody selector for BM4_L friction-bearing restraints.
 *
 * Friction-site membership comes from ACCDB INPUT_RESTRAINTS, not from node
 * exceptions or from the load-case multiplier. The governed model coefficient
 * remains the magnitude used by the nonlinear law; FRIC_COEF is used here to
 * identify which physical restraint rows carry friction and to corroborate the
 * database's single-precision storage of that model coefficient.
 */

export const BM4L_ACCDB_FRICTION_RESTRAINT_TYPE_ID = 3;
export const BM4L_ACCDB_FRICTION_RESTRAINT_TYPE = 'Y';
export const BM4L_ACCDB_FRICTION_DIRECTION = Object.freeze([0, 1, 0]);
const DIRECTION_TOLERANCE = 1e-9;

/**
 * Select friction-bearing BM4_L INPUT_RESTRAINTS rows.
 *
 * Historical diagnostic row evidence establishes that BM4_L uses type 3/Y,
 * positive FRIC_COEF and global +Y for friction surfaces. Production authority
 * still comes from the issue-pinned ACCDB itself. The comparison to model mu is
 * deliberately made after Math.fround so mdb-reader implementations that return
 * either 0.3 or the expanded float32 value 0.30000001192092896 remain equivalent.
 *
 * GUI/LIM/ANC rows remain in the mechanical model as ordinary restraints, but
 * they never create a friction surface merely because they are non-anchors.
 */
export function selectBm4lAccdbFrictionRows(rowsInput, modelCoefficientInput) {
  if (!Array.isArray(rowsInput) || rowsInput.length === 0) {
    throw new TypeError('BM4_L friction selection requires INPUT_RESTRAINTS rows.');
  }
  const modelCoefficient = finiteNonnegative(modelCoefficientInput, 'modelCoefficient');
  const storedModelCoefficient = Math.fround(modelCoefficient);
  const selected = [];

  rowsInput.forEach((row, sourceRowIndex) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      throw new TypeError(`INPUT_RESTRAINTS[${sourceRowIndex}] must be an object.`);
    }
    const nodeId = nonempty(row.NODE_NUM, `INPUT_RESTRAINTS[${sourceRowIndex}].NODE_NUM`);
    const typeId = finiteInteger(row.RES_TYPEID, `INPUT_RESTRAINTS[${sourceRowIndex}].RES_TYPEID`);
    const sourceCoefficient = Number(row.FRIC_COEF);
    if (!Number.isFinite(sourceCoefficient)) {
      throw new TypeError(`INPUT_RESTRAINTS[${sourceRowIndex}] node ${nodeId} lacks finite FRIC_COEF custody.`);
    }
    if (!(sourceCoefficient > 0)) return;

    if (typeId !== BM4L_ACCDB_FRICTION_RESTRAINT_TYPE_ID) {
      throw new TypeError(
        `INPUT_RESTRAINTS[${sourceRowIndex}] node ${nodeId} carries positive FRIC_COEF on `
        + `RES_TYPEID ${typeId}; BM4_L Stage 2 authorizes friction only on ACCDB type Y (3).`,
      );
    }
    if (Math.fround(sourceCoefficient) !== storedModelCoefficient) {
      throw new TypeError(
        `INPUT_RESTRAINTS[${sourceRowIndex}] node ${nodeId} stores FRIC_COEF=${sourceCoefficient}, `
        + `which does not corroborate float32(model mu)=${storedModelCoefficient}.`,
      );
    }

    const direction = sourceDirection(row, sourceRowIndex, nodeId);
    if (!same3(direction, BM4L_ACCDB_FRICTION_DIRECTION, DIRECTION_TOLERANCE)) {
      throw new TypeError(
        `INPUT_RESTRAINTS[${sourceRowIndex}] node ${nodeId} is a friction-bearing Y row with `
        + `direction [${direction.join(',')}]; BM4_L friction rows must be global +Y within `
        + `${DIRECTION_TOLERANCE}.`,
      );
    }

    selected.push(Object.freeze({
      row,
      sourceRowIndex,
      nodeId,
      sourceRestraintTypeId: typeId,
      sourceRestraintType: BM4L_ACCDB_FRICTION_RESTRAINT_TYPE,
      sourceFrictionCoefficient: sourceCoefficient,
      sourceFrictionCoefficientFloat32: Math.fround(sourceCoefficient),
      governedModelCoefficient: modelCoefficient,
      storedModelCoefficient,
      normalDirection: Object.freeze([...direction]),
    }));
  });

  if (selected.length === 0) {
    throw new TypeError('BM4_L has nonzero effective friction but no positive-FRIC_COEF Y restraint rows.');
  }
  const duplicateNodes = duplicates(selected.map((entry) => entry.nodeId));
  if (duplicateNodes.length > 0) {
    throw new TypeError(
      `BM4_L Stage 2 expects one friction-bearing Y surface per node; duplicates: ${duplicateNodes.join(', ')}.`,
    );
  }
  return Object.freeze(selected);
}

function sourceDirection(row, index, nodeId) {
  const direction = [Number(row.XCOSINE), Number(row.YCOSINE), Number(row.ZCOSINE)];
  if (direction.some((value) => !Number.isFinite(value))) {
    throw new TypeError(`INPUT_RESTRAINTS[${index}] node ${nodeId} has non-finite direction cosines.`);
  }
  const magnitude = Math.hypot(...direction);
  if (!(magnitude > 0)) {
    throw new TypeError(`INPUT_RESTRAINTS[${index}] node ${nodeId} has zero restraint direction.`);
  }
  return direction.map((value) => clean(value / magnitude));
}

function same3(left, right, tolerance) {
  return left.length === 3 && right.length === 3
    && left.every((value, index) => Math.abs(value - right[index]) <= tolerance);
}

function duplicates(values) {
  const seen = new Set();
  const duplicate = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicate.add(value);
    seen.add(value);
  }
  return [...duplicate].sort(compareText);
}

function finiteNonnegative(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new TypeError(`${field} must be finite and nonnegative.`);
  return number;
}

function finiteInteger(value, field) {
  const number = Number(value);
  if (!Number.isInteger(number)) throw new TypeError(`${field} must be a finite integer.`);
  return number;
}

function nonempty(value, field) {
  const text = String(value ?? '').trim();
  if (!text) throw new TypeError(`${field} must be nonempty.`);
  return text;
}

function clean(value) {
  return Object.is(value, -0) || Math.abs(value) < 1e-14 ? 0 : value;
}

function compareText(left, right) {
  return String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0;
}
