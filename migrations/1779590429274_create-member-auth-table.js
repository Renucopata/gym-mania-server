/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * Phase 1c — M5
 * Create the member_auth table that links a self-registered member's login
 * credentials to their cliente row. FK is ON DELETE CASCADE: removing the
 * cliente removes the auth row.
 *
 * The email_lower column stores the email in lowercase form for lookup; two
 * CHECK constraints guarantee both the lowercase invariant and a minimal
 * email-format regex (defence-in-depth alongside Zod + the register_member
 * procedure check that lands in M6).
 *
 * A dedicated touch_member_auth_updated_at() trigger maintains updated_at on
 * every row update. We do NOT reuse the existing actualizar_fecha_modificacion
 * function from baseline because that one targets a column named
 * `actualizado_en`, not `updated_at`.
 */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE public.member_auth (
      carnet_identidad VARCHAR(20) PRIMARY KEY
        REFERENCES public.cliente(carnet_identidad) ON DELETE CASCADE,
      email_lower VARCHAR(150) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT member_auth_email_lowercase
        CHECK (email_lower = LOWER(email_lower)),
      CONSTRAINT member_auth_email_format
        CHECK (email_lower ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$')
    );

    CREATE OR REPLACE FUNCTION public.touch_member_auth_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at := CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_member_auth_touch_updated_at
    BEFORE UPDATE ON public.member_auth
    FOR EACH ROW EXECUTE FUNCTION public.touch_member_auth_updated_at();
  `);
};

/**
 * down: drop in reverse dependency order. All IF EXISTS so the rollback is
 * idempotent and safe to re-run if a previous down was partial.
 */
exports.down = (pgm) => {
  pgm.sql(`
    DROP TRIGGER IF EXISTS trg_member_auth_touch_updated_at ON public.member_auth;
    DROP FUNCTION IF EXISTS public.touch_member_auth_updated_at();
    DROP TABLE IF EXISTS public.member_auth;
  `);
};
