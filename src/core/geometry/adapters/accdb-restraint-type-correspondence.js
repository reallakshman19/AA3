import { DEFAULT_RESTRAINT_TYPE_CODE_MAP, restraintTypeCodeLabel } from './inputxml-restraint-type-mutation.js';

export const ACCDB_RESTRAINT_TYPE_CORRESPONDENCE_SCHEMA = 'accdb-restraint-type-correspondence/v1';
export const ACCDB_RESTRAINT_TYPE_CORRESPONDENCE_AUTHORITY =
  'PAIRED_CAESAR_EXPORT_CROSSCHECK_BM4_L_V1';

/**
 * CAESAR's ACCDB restraint numbering is NOT the InputXML restraint numbering.
 *
 * INPUT_RESTRAINTS.RES_TYPEID and InputXML's <RESTRAINT TYPE> are different
 * enumerations of the same physical restraint set, and they disagree in a way
 * that silently swaps two real restraint kinds: ACCDB 8 is GUI and ACCDB 9 is
 * LIM, while InputXML's corrected codes are the other way round (8 = LIM,
 * 9 = GUI). Reading ACCDB codes through the InputXML map -- the obvious thing
 * to do, since both are "CAESAR restraint type codes" -- would therefore turn
 * every guide into a limit stop and every limit stop into a guide without a
 * single diagnostic firing.
 *
 * The correspondence below was not inferred from the numbering. It was read
 * off a paired export of one model, BM4_L, which exists as ACCDB, as
 * InputXML, and as a CAESAR output report:
 *
 *   - All 46 INPUT_RESTRAINTS rows pair 1:1 with the 46 InputXML <RESTRAINT>
 *     rows on (node, direction cosines), with no ambiguity and no conflicts.
 *   - CAESAR's own RESTRAINT_REPORT in Output_BM4.xml names each of those 46
 *     restraints in its own words -- ANC, +Y, GUI, LIM -- and lines up
 *     node-for-node with the ACCDB rows in file order, giving the label
 *     directly rather than through anyone's interpretation of a code.
 *
 * That evidence covers exactly the four codes BM4_L uses. Every other
 * RES_TYPEID is genuinely unknown here: `accdbRestraintTypeCorrespondence`
 * returns null for it, and the caller must fail closed. A restraint whose
 * kind is unknown must never be modelled as some default -- an omitted or
 * misread support changes the load path and every reaction that follows from
 * it. New codes are new evidence to add here from a paired export, not
 * something to extrapolate from the numbering.
 */
const CORRESPONDENCE = Object.freeze({
  1: Object.freeze({ label: 'ANC', correctedTypeCode: '0' }),
  3: Object.freeze({ label: '+Y', correctedTypeCode: '14' }),
  8: Object.freeze({ label: 'GUI', correctedTypeCode: '9' }),
  9: Object.freeze({ label: 'LIM', correctedTypeCode: '8' }),
});

export const ACCDB_RESTRAINT_TYPE_CORRESPONDENCE_PROFILE = Object.freeze({
  schema: ACCDB_RESTRAINT_TYPE_CORRESPONDENCE_SCHEMA,
  authority: ACCDB_RESTRAINT_TYPE_CORRESPONDENCE_AUTHORITY,
  evidence: Object.freeze([
    'BM4_L.ACCDB INPUT_RESTRAINTS (46 rows) paired 1:1 with InputXML_BM4.xml <RESTRAINT> on (node, cosines).',
    'Output_BM4.xml RESTRAINT_REPORT names all 46 in CAESAR\'s own labels, aligned node-for-node in file order.',
  ]),
  rows: CORRESPONDENCE,
});

/**
 * Resolve one ACCDB RES_TYPEID to the corrected restraint type code the rest
 * of the pipeline already speaks, or null when this project has no evidence
 * for that code.
 */
export function accdbRestraintTypeCorrespondence(resTypeId) {
  if (resTypeId === null || resTypeId === undefined) return null;
  const key = String(Math.round(Number(resTypeId)));
  const row = CORRESPONDENCE[key];
  if (!row) return null;
  const conditioningClass = DEFAULT_RESTRAINT_TYPE_CODE_MAP[row.correctedTypeCode] ?? null;
  return Object.freeze({
    sourceTypeCode: key,
    typeCode: row.correctedTypeCode,
    typeLabel: row.label,
    // Cross-check: the corrected code must resolve, through the pipeline's own
    // canonical label table, back to the label CAESAR printed. If those two
    // ever disagree the correspondence row is wrong, and saying so beats
    // modelling the wrong restraint.
    canonicalLabel: restraintTypeCodeLabel(row.correctedTypeCode),
    conditioningClass,
  });
}

export const ACCDB_RESTRAINT_TYPE_CODES_WITH_EVIDENCE = Object.freeze(Object.keys(CORRESPONDENCE));
