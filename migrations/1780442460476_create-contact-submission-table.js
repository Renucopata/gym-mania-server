/* eslint-disable camelcase */

// Migration M7 — create contact_submission table for the public lead-capture
// endpoint (POST /api/leads/contact) plus the staff CRM that works it.
//
// up:
//   - Table contact_submission with status/assigned_to/source columns.
//   - Two indexes: (status, created_at DESC) for the admin list view, and a
//     partial index on assigned_to for "leads assigned to me" queries.
//   - Trigger to auto-update updated_at on row update.
// down:
//   - Reverses each object in reverse creation order.

/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
CREATE TABLE public.contact_submission (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  telefono VARCHAR(20) NULL,
  mensaje TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'new',
  assigned_to VARCHAR(20) NULL
    REFERENCES public.personal(carnet_identidad) ON DELETE SET NULL,
  source VARCHAR(50) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT contact_submission_email_format
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'),
  CONSTRAINT contact_submission_status_valid
    CHECK (status IN ('new', 'contacted', 'qualified', 'closed')),
  CONSTRAINT contact_submission_nombre_length
    CHECK (LENGTH(TRIM(nombre)) >= 2),
  CONSTRAINT contact_submission_mensaje_length
    CHECK (LENGTH(TRIM(mensaje)) >= 10 AND LENGTH(mensaje) <= 2000)
);

CREATE INDEX contact_submission_status_created_at_idx
  ON public.contact_submission(status, created_at DESC);

CREATE INDEX contact_submission_assigned_to_idx
  ON public.contact_submission(assigned_to)
  WHERE assigned_to IS NOT NULL;

CREATE OR REPLACE FUNCTION public.touch_contact_submission_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_contact_submission_touch_updated_at
BEFORE UPDATE ON public.contact_submission
FOR EACH ROW EXECUTE FUNCTION public.touch_contact_submission_updated_at();
`);
};

exports.down = (pgm) => {
  pgm.sql(`
DROP TRIGGER IF EXISTS trg_contact_submission_touch_updated_at
  ON public.contact_submission;
DROP FUNCTION IF EXISTS public.touch_contact_submission_updated_at();
DROP INDEX IF EXISTS public.contact_submission_assigned_to_idx;
DROP INDEX IF EXISTS public.contact_submission_status_created_at_idx;
DROP TABLE IF EXISTS public.contact_submission;
`);
};
