/* eslint-disable camelcase */

// Migration 1 — update insert_personal() to the new role taxonomy.
//
// up:   role validation accepts ('admin', 'employee').
// down: role validation reverts to ('admin', 'user', 'sistemas').
//
// Everything else in the procedure (signature, genero/estado/email
// validations, the INSERT) is byte-for-byte identical to the baseline.
// This MUST run before the data migration and the CHECK constraint so there
// is never a window where valid inserts are blocked.

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
CREATE OR REPLACE PROCEDURE public.insert_personal(IN p_carnet_identidad character varying, IN p_nombre character varying, IN p_apellido character varying, IN p_correo character varying, IN p_numero_telefono character varying, IN p_fecha_nacimiento date, IN p_genero character varying, IN p_persona_emergencia character varying, IN p_contacto_emergencia character varying, IN p_fecha_contratacion date, IN p_estado character varying, IN p_contrasena_encriptada character varying, IN p_role character varying)
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Validate required fields
    IF p_carnet_identidad IS NULL OR p_carnet_identidad = '' THEN
        RAISE EXCEPTION 'Carnet de Identidad no puede estar vacío.';
    END IF;
    IF p_nombre IS NULL OR p_nombre = '' THEN
        RAISE EXCEPTION 'Nombre no puede estar vacío.';
    END IF;
    IF p_apellido IS NULL OR p_apellido = '' THEN
        RAISE EXCEPTION 'Apellido no puede estar vacío.';
    END IF;
    IF p_contrasena_encriptada IS NULL OR p_contrasena_encriptada = '' THEN
        RAISE EXCEPTION 'Contraseña no puede estar vacía.';
    END IF;
    IF p_role IS NULL OR p_role = '' THEN
        RAISE EXCEPTION 'Rol no puede estar vacío.';
    END IF;

    -- Check for existing employee
    IF EXISTS (
        SELECT 1
        FROM personal
        WHERE carnet_identidad = p_carnet_identidad
    ) THEN
        RAISE EXCEPTION 'El empleado con este carnet de identidad ya existe.';
    END IF;

    -- Validate \`genero\`
    IF p_genero NOT IN ('masculino', 'femenino', 'otro') THEN
        RAISE EXCEPTION 'Género inválido. Debe ser masculino, femenino u otro.';
    END IF;

    -- Validate \`estado\`
    IF p_estado NOT IN ('activo', 'inactivo') THEN
        RAISE EXCEPTION 'Estado inválido. Debe ser activo o inactivo.';
    END IF;

    -- Validate \`role\`
    IF p_role NOT IN ('admin', 'employee') THEN
        RAISE EXCEPTION 'Role inválido. Debe ser admin o employee.';
    END IF;

    -- Insert employee
    INSERT INTO personal (
        carnet_identidad, nombre, apellido, correo, numero_telefono, fecha_nacimiento,
        genero, persona_emergencia, contacto_emergencia, fecha_contratacion, estado,
        contrasena_encriptada, rol
    ) VALUES (
        p_carnet_identidad, p_nombre, p_apellido, p_correo, p_numero_telefono, p_fecha_nacimiento,
        p_genero, p_persona_emergencia, p_contacto_emergencia, p_fecha_contratacion, p_estado,
        p_contrasena_encriptada, p_role
    );

    -- Optional logging
    RAISE NOTICE 'Empleado insertado exitosamente: % % (Carnet: %)', p_nombre, p_apellido, p_carnet_identidad;

EXCEPTION
    WHEN OTHERS THEN
        -- Log the error
        RAISE NOTICE 'Error al insertar empleado: %', SQLERRM;
        -- Re-raise the error for client-side handling
        RAISE;
END;
$$;
`);
};

exports.down = (pgm) => {
  pgm.sql(`
CREATE OR REPLACE PROCEDURE public.insert_personal(IN p_carnet_identidad character varying, IN p_nombre character varying, IN p_apellido character varying, IN p_correo character varying, IN p_numero_telefono character varying, IN p_fecha_nacimiento date, IN p_genero character varying, IN p_persona_emergencia character varying, IN p_contacto_emergencia character varying, IN p_fecha_contratacion date, IN p_estado character varying, IN p_contrasena_encriptada character varying, IN p_role character varying)
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Validate required fields
    IF p_carnet_identidad IS NULL OR p_carnet_identidad = '' THEN
        RAISE EXCEPTION 'Carnet de Identidad no puede estar vacío.';
    END IF;
    IF p_nombre IS NULL OR p_nombre = '' THEN
        RAISE EXCEPTION 'Nombre no puede estar vacío.';
    END IF;
    IF p_apellido IS NULL OR p_apellido = '' THEN
        RAISE EXCEPTION 'Apellido no puede estar vacío.';
    END IF;
    IF p_contrasena_encriptada IS NULL OR p_contrasena_encriptada = '' THEN
        RAISE EXCEPTION 'Contraseña no puede estar vacía.';
    END IF;
    IF p_role IS NULL OR p_role = '' THEN
        RAISE EXCEPTION 'Rol no puede estar vacío.';
    END IF;

    -- Check for existing employee
    IF EXISTS (
        SELECT 1
        FROM personal
        WHERE carnet_identidad = p_carnet_identidad
    ) THEN
        RAISE EXCEPTION 'El empleado con este carnet de identidad ya existe.';
    END IF;

    -- Validate \`genero\`
    IF p_genero NOT IN ('masculino', 'femenino', 'otro') THEN
        RAISE EXCEPTION 'Género inválido. Debe ser masculino, femenino u otro.';
    END IF;

    -- Validate \`estado\`
    IF p_estado NOT IN ('activo', 'inactivo') THEN
        RAISE EXCEPTION 'Estado inválido. Debe ser activo o inactivo.';
    END IF;

    -- Validate \`role\`
    IF p_role NOT IN ('admin', 'user', 'sistemas') THEN
        RAISE EXCEPTION 'Role inválido. Debe ser admin, user o sistemas.';
    END IF;

    -- Insert employee
    INSERT INTO personal (
        carnet_identidad, nombre, apellido, correo, numero_telefono, fecha_nacimiento,
        genero, persona_emergencia, contacto_emergencia, fecha_contratacion, estado,
        contrasena_encriptada, rol
    ) VALUES (
        p_carnet_identidad, p_nombre, p_apellido, p_correo, p_numero_telefono, p_fecha_nacimiento,
        p_genero, p_persona_emergencia, p_contacto_emergencia, p_fecha_contratacion, p_estado,
        p_contrasena_encriptada, p_role
    );

    -- Optional logging
    RAISE NOTICE 'Empleado insertado exitosamente: % % (Carnet: %)', p_nombre, p_apellido, p_carnet_identidad;

EXCEPTION
    WHEN OTHERS THEN
        -- Log the error
        RAISE NOTICE 'Error al insertar empleado: %', SQLERRM;
        -- Re-raise the error for client-side handling
        RAISE;
END;
$$;
`);
};
