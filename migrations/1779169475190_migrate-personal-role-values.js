/* eslint-disable camelcase */

// Migration 2 — migrate existing personal.rol values to the new taxonomy.
//
// Runs AFTER migration 1 (insert_personal already accepts the new enum) and
// BEFORE migration 3 (the CHECK constraint), so every row is left valid for
// the constraint.
//
//   up:   'user'     -> 'employee'
//         'sistemas' -> 'admin'
//         ('admin' stays 'admin' — no row touched)
//
//   down: 'employee' -> 'user'
//         (see note in down: 'sistemas' -> 'admin' is intentionally NOT
//          reversed — it cannot be done losslessly.)
//
// A safety check aborts the migration if any unexpected rol value exists.

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM personal
  WHERE rol IS NOT NULL AND rol NOT IN ('admin', 'user', 'sistemas', 'employee');

  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Found % personal rows with unexpected rol values. Aborting migration. Investigate before continuing.', invalid_count;
  END IF;
END $$;

UPDATE personal SET rol = 'employee' WHERE rol = 'user';
UPDATE personal SET rol = 'admin' WHERE rol = 'sistemas';
`);
};

exports.down = (pgm) => {
  pgm.sql(`
-- Reverse only the lossless half of the mapping.
UPDATE personal SET rol = 'user' WHERE rol = 'employee';

-- NOTE: the 'sistemas' -> 'admin' mapping is one-way and CANNOT be reverted
-- losslessly: once former 'sistemas' rows became 'admin', they are
-- indistinguishable from rows that were always 'admin'. We deliberately do
-- NOT attempt to turn any 'admin' back into 'sistemas'. Rolling back this
-- migration therefore leaves former 'sistemas' users as 'admin', which is
-- the safer direction (they retain admin access rather than losing it).
`);
};
