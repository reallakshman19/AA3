/**
 * Source-custody selector for BM4_L friction-bearing restraints.
 *
 * Friction-site membership comes from the issue-pinned ACCDB INPUT_RESTRAINTS
 * rows, not from node exceptions, historical topology, or the load-case
 * multiplier. The governed model coefficient remains the magnitude used by the
 * nonlinear law; FRIC_COEF identifies which physical restraint row carries
 * friction and corroborates the database's single-precision coefficient value.
 */

export const CAESAR_ACCDB_ANCHOR_RESTRAINT_TYPE_ID = 1;
export const BM4L_FRICTION_DIRECTION_ALIGNMENT_TOLERANCE = 1e-9;

/**
 * Select friction-bearing BM4_L INPUT_RESTRAINTS rows.
 *
 * Production rules deliberately do not assume the type-3/+Y pattern observed in
 * a non-authoritative historical extraction. The pinned ACCDB is authoritative:
 * any non-anchor directional restraint with positive FRIC_COEF is a friction
 * surface when its coefficient corroborates model mu. The current qualified
 * linear restraint adapter represents directional restraints on one dominant
 * translational DOF, so a positive-friction skew restraint fails closed rather
 * than mixing a rotated friction plane with an axis-projected normal spring.
 *
 * The comparison to model mu is made after Math.fround so mdb-reader
 * implementations that return either 0.3 or the expanded float32 value
 * 0.30000001192092896 remain equivalent.
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

    if (typeId === CAESAR_ACCDB_ANCHOR_RESTRAINT_TYPE_ID) {
      throw new TypeError(
        `INPUT_RESTRAINTS[${sourceRowIndex}] anchor node ${nodeId} carries positive FRIC_COEF; `
        + 'Stage 2 does not define friction on a fully restrained anchor.',
      );
    }
    if (Math.fround(sourceCoefficient) !== storedModelCoefficient) {
      throw new TypeError(
        `INPUT_RESTRAINTS[${sourceRowIndex}] node ${nodeId} stores FRIC_COEF=${sourceCoefficient}, `
        + `which does not corroborate float32(model mu)=${storedModelCoefficient}.`,
      );
    }

    const normalDirection = axisAlignedSourceDirection(row, sourceRowIndex, nodeId);
    selected.push(Object.freeze({
      row,
      sourceRowIndex,
      nodeId,
      sourceRestraintTypeId: typeId,
      sourceRestraintType: `RES_TYPEID_${typeId}`,
      sourceFrictionCoefficient: sourceCoefficient,
      sourceFrictionCoefficientFloat32: Math.fround(sourceCoefficient),
      governedModelCoefficient: modelCoefficient,
      storedModelCoefficient,
      normalDirection: Object.freeze([...normalDirection]),
    }));
  });

  if (selected.length === 0) {
    throw new TypeError('BM4_L has nonzero effective friction but no positive-FRIC_COEF directional restraint rows.');
  }
  const duplicateNodes = duplicates(selected.map((entry) => entry.nodeId));
  if (duplicateNodes.length > 0) {
    throw new TypeError(
      `BM4_L Stage 2 supports one friction-bearing restraint surface per node; `
      + `multi-plane friction is not implemented at nodes: ${duplicateNodes.join(', ')}.`,
    );
  }
  return Object.freeze(selected);
}

function axisAlignedSourceDirection(row, index, nodeId) {
  const direction = [Number(row.XCOSINE), Number(row.YCOSINE), Number(row.ZCOSINE)];
  if (direction.some((value) => !Number.isFinite(value))) {
    throw new TypeError(`INPUT_RESTRAINTS[${index}] node ${nodeId} has non-finite direction cosines.`);
  }
  const magnitude = Math.hypot(...direction);
  if (!(magnitude > 0)) {
    throw new TypeError(`INPUT_RESTRAINTS[${index}] node ${nodeId} has zero restraint direction.`);
  }
  const unit = direction.map((value) => clean(value / magnitude));
  const magnitudes = unit.map(Math.abs);
  const dominantIndex = magnitudes.indexOf(Math.max(...magnitudes));
  const skewed = magnitudes.some((value, axis) =>
    axis !== dominantIndex && value > BM4L_FRICTION_DIRECTION_ALIGNMENT_TOLERANCE);
  if (skewed) {
    throw new TypeError(
      `INPUT_RESTRAINTS[${index}] node ${nodeId} carries friction on skew direction `
      + `[${unit.join(',')}]; Stage 2 requires an axis-aligned friction normal because the `
      + 'qualified base restraint adapter is axis projected.',
    );
  }
  return unit;
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
