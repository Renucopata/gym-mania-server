/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * Phase 1c — M6
 * Create the register_member stored procedure. Called from the Node-side
 * member-registration controller; runs in a single implicit transaction so
 * the cliente row and member_auth row commit together or not at all.
 *
 * Validates email format and genero defensively (Zod + member_auth CHECKs
 * already enforce these — this is the last line of defence at the DB
 * boundary), then checks uniqueness BEFORE attempting the inserts so we can
 * raise clean CARNET_EXISTS / EMAIL_EXISTS sentinels for the controller to
 * map to HTTP 409s. The cliente.correo equality check is intentionally
 * case-sensitive (matches the column's stored form); the member_auth check
 * covers the case-insensitive dedup via email_lower.
 *
 * Newly-registered members start with persona_emergencia/numero_emergencia/
 * foto = NULL, dia_prueba_usado = FALSE, and estado = 'inactivo' (no
 * membership yet — admins activate later).
 */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE OR REPLACE PROCEDURE public.register_member(
      p_carnet_identidad VARCHAR(20),
      p_nombre           VARCHAR(50),
      p_apellido         VARCHAR(50),
      p_email            VARCHAR(150),
      p_password_hash    VARCHAR(255),
      p_numero_celular   VARCHAR(15),
      p_fecha_nacimiento DATE,
      p_genero           VARCHAR(20)
    )
    LANGUAGE plpgsql
    AS $$
    DECLARE
      v_email_lower VARCHAR(150);
    BEGIN
      v_email_lower := LOWER(p_email);

      IF v_email_lower !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Email inválido.';
      END IF;

      IF p_genero NOT IN ('masculino', 'femenino', 'otro') THEN
        RAISE EXCEPTION 'Género inválido. Debe ser masculino, femenino u otro.';
      END IF;

      IF EXISTS (SELECT 1 FROM public.cliente WHERE carnet_identidad = p_carnet_identidad) THEN
        RAISE EXCEPTION 'CARNET_EXISTS';
      END IF;
      IF EXISTS (SELECT 1 FROM public.member_auth WHERE email_lower = v_email_lower) THEN
        RAISE EXCEPTION 'EMAIL_EXISTS';
      END IF;
      IF EXISTS (SELECT 1 FROM public.cliente WHERE correo = p_email) THEN
        RAISE EXCEPTION 'EMAIL_EXISTS';
      END IF;

      INSERT INTO public.cliente (
        carnet_identidad, nombre, apellido, correo, numero_celular,
        fecha_nacimiento, genero, persona_emergencia, numero_emergencia,
        dia_prueba_usado, estado, foto
      ) VALUES (
        p_carnet_identidad, p_nombre, p_apellido, p_email, p_numero_celular,
        p_fecha_nacimiento, p_genero, NULL, NULL,
        FALSE, 'inactivo', NULL
      );

      INSERT INTO public.member_auth (carnet_identidad, email_lower, password_hash)
      VALUES (p_carnet_identidad, v_email_lower, p_password_hash);
    END;
    $$;
  `);
};

/**
 * down: drop the procedure. The signature must match exactly for the DROP
 * to resolve (overload resolution is by argument types).
 */
exports.down = (pgm) => {
  pgm.sql(`
    DROP PROCEDURE IF EXISTS public.register_member(
      VARCHAR(20), VARCHAR(50), VARCHAR(50), VARCHAR(150), VARCHAR(255),
      VARCHAR(15), DATE, VARCHAR(20)
    );
  `);
};
