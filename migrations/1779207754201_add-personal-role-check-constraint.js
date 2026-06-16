/* eslint-disable camelcase */

// Migration 3 — enforce the new role taxonomy at the database level.
//
// Runs LAST: migration 1 made insert_personal accept the new enum and
// migration 2 already migrated every existing row to ('admin','employee'),
// so this constraint will not reject any existing data.
//
//   up:   ADD CONSTRAINT personal_rol_check CHECK (rol IN ('admin','employee'))
//   down: DROP that constraint (IF EXISTS, so the down is idempotent)

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
ALTER TABLE personal
ADD CONSTRAINT personal_rol_check
CHECK (rol IN ('admin', 'employee'));
`);
};

exports.down = (pgm) => {
  pgm.sql(`
ALTER TABLE personal
DROP CONSTRAINT IF EXISTS personal_rol_check;
`);
};
