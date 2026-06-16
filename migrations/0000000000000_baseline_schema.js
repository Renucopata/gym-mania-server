/* eslint-disable camelcase */

// Baseline schema — captures the database exactly as it exists in Neon today
// (derived verbatim from smash-schema.sql, pg_dump of database version 16.12,
// dumped 2026-05-17).
//
// IMPORTANT: this migration is NOT meant to run against Neon. The current Neon
// database already contains this schema. After this file exists, mark it as
// already-applied by inserting its name directly into the pgmigrations table
// (see PHASE_1B summary for the exact psql commands). The `up` here exists so a
// fresh database (future local/test DB) can be recreated from zero, and `down`
// exists to make the migration legitimate/reversible.

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
SET check_function_bodies = false;

CREATE FUNCTION public.actualizar_fecha_modificacion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE PROCEDURE public.insert_nueva_subscripcion(IN p_carnet_identidad_cliente character varying, IN p_fecha_inicio date, IN p_fecha_fin date, IN p_monto_pagado numeric, IN p_metodo_pago character varying, IN p_inscrito_por character varying, IN p_tipo character varying, IN p_descuento numeric DEFAULT 0, IN p_descripcion_descuento character varying DEFAULT NULL::character varying, IN p_entradas integer DEFAULT NULL::integer)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_cliente_exists BOOLEAN;
    v_personal_exists BOOLEAN;
    v_current_date DATE := CURRENT_DATE;
    v_overlapping_subscription BOOLEAN;
    v_final_monto_pagado NUMERIC(10,2);
BEGIN
    -- Validate input dates
    IF p_fecha_inicio > p_fecha_fin THEN
        RAISE EXCEPTION 'La fecha de inicio no puede ser después de la fecha fin.';
    END IF;

    -- Validate dates are not in the past (implement after debuggin)
    -- IF p_fecha_inicio < v_current_date THEN
       -- RAISE EXCEPTION 'La fecha de inicio no puede ser anterior a la de hoy.';
    --END IF;

    -- Check if cliente exists
    SELECT EXISTS (
        SELECT 1
        FROM cliente
        WHERE carnet_identidad = p_carnet_identidad_cliente
    ) INTO v_cliente_exists;

    IF NOT v_cliente_exists THEN
        RAISE EXCEPTION 'Cliente no registrado aún.';
    END IF;

    -- Check if personal exists
    SELECT EXISTS (
        SELECT 1
        FROM personal
        WHERE carnet_identidad = p_inscrito_por
    ) INTO v_personal_exists;

    IF NOT v_personal_exists THEN
        RAISE EXCEPTION 'Personal no encontrado.';
    END IF;

    -- Check for overlapping subscriptions
    SELECT EXISTS (
        SELECT 1
        FROM subscripcion
        WHERE carnet_identidad_cliente = p_carnet_identidad_cliente
        AND (
            (p_fecha_inicio BETWEEN fecha_inicio AND fecha_fin) OR
            (p_fecha_fin BETWEEN fecha_inicio AND fecha_fin) OR
            (fecha_inicio BETWEEN p_fecha_inicio AND p_fecha_fin)
        )
    ) INTO v_overlapping_subscription;

    IF v_overlapping_subscription THEN
        RAISE EXCEPTION 'Ya existe una subscripción en el periodo de tiempo ingresado.';
    END IF;

    -- Calculate final amount after discount
    v_final_monto_pagado := p_monto_pagado - p_descuento;

	IF p_entradas IS NULL THEN
		-- Insert new subscription with out entries
	    INSERT INTO subscripcion (
	        carnet_identidad_cliente,
	        fecha_inicio,
	        fecha_fin,
	        monto_pagado,
	        descuento,
	        descripcion_descuento,
	        metodo_pago,
	        inscrito_por,
			tipo
	    ) VALUES (
	        p_carnet_identidad_cliente,
	        p_fecha_inicio,
	        p_fecha_fin,
	        v_final_monto_pagado,
	        p_descuento,
	        p_descripcion_descuento,
	        p_metodo_pago,
	        p_inscrito_por,
			p_tipo
	    );
	ELSE
		-- Insert new subscription with entries
	    INSERT INTO subscripcion (
	        carnet_identidad_cliente,
	        fecha_inicio,
	        fecha_fin,
	        monto_pagado,
	        descuento,
	        descripcion_descuento,
	        metodo_pago,
	        inscrito_por,
			entradas,
			tipo
	    ) VALUES (
	        p_carnet_identidad_cliente,
	        p_fecha_inicio,
	        p_fecha_fin,
	        v_final_monto_pagado,
	        p_descuento,
	        p_descripcion_descuento,
	        p_metodo_pago,
	        p_inscrito_por,
			p_entradas,
			p_tipo
	    );
	END IF;

    -- Confirm successful creation
    RAISE NOTICE 'Membresía creada exitosamente. Expira el: %', TO_CHAR(p_fecha_fin, 'YYYY-MM-DD');

EXCEPTION
    WHEN OTHERS THEN
        -- Log or handle unexpected errors
        RAISE EXCEPTION 'Ocurrió un error: %', SQLERRM;
END;
$$;

CREATE PROCEDURE public.insert_nuevo_cliente(IN p_carnet_identidad character varying, IN p_nombre character varying, IN p_apellido character varying, IN p_correo character varying, IN p_numero_celular character varying DEFAULT NULL::character varying, IN p_fecha_nacimiento date DEFAULT NULL::date, IN p_genero character varying DEFAULT NULL::character varying, IN p_persona_emergencia character varying DEFAULT NULL::character varying, IN p_numero_emergencia character varying DEFAULT NULL::character varying, IN p_foto bytea DEFAULT NULL::bytea, IN p_estado character varying DEFAULT 'activo'::character varying)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_client_exists BOOLEAN;
BEGIN
    -- Validate input - ensure required fields are not null
    IF p_carnet_identidad IS NULL OR TRIM(p_carnet_identidad) = '' THEN
        RAISE EXCEPTION 'Carnet de identidad es un campo requerido.';
    END IF;

    IF p_nombre IS NULL OR TRIM(p_nombre) = '' THEN
        RAISE EXCEPTION 'Nombre es un campo requerido.';
    END IF;

    IF p_apellido IS NULL OR TRIM(p_apellido) = '' THEN
        RAISE EXCEPTION 'Apellido es un campo requerido.';
    END IF;

    -- Check if client already exists
    SELECT EXISTS (
        SELECT 1
        FROM cliente
        WHERE carnet_identidad = p_carnet_identidad
    ) INTO v_client_exists;

    IF v_client_exists THEN
        RAISE EXCEPTION 'Ya existe un cliente con este carnet de identidad.';
    END IF;

    -- Validate birth date (optional, but if provided, ensure it's not in the future)
    IF p_fecha_nacimiento IS NOT NULL AND p_fecha_nacimiento > CURRENT_DATE THEN
        RAISE EXCEPTION 'Fecha de nacimiento no puede ser una fecha futura.';
    END IF;

    -- Insert new client
    INSERT INTO cliente (
        carnet_identidad,
        nombre,
        apellido,
        correo,
        numero_celular,
        fecha_nacimiento,
        genero,
        persona_emergencia,
        numero_emergencia,
        foto,
        estado,
        dia_prueba_usado
    ) VALUES (
        p_carnet_identidad,
        p_nombre,
        p_apellido,
        p_correo,
        p_numero_celular,
        p_fecha_nacimiento,
        p_genero,
        p_persona_emergencia,
        p_numero_emergencia,
        p_foto,
        p_estado,
        FALSE
    );

    -- Confirm success
    RAISE NOTICE 'Cliente creado exitosamente.';

EXCEPTION
    WHEN OTHERS THEN
        -- Log and re-raise unexpected errors
        RAISE EXCEPTION 'Ocurrió un error: %', SQLERRM;
END;
$$;

CREATE PROCEDURE public.insert_personal(IN p_carnet_identidad character varying, IN p_nombre character varying, IN p_apellido character varying, IN p_correo character varying, IN p_numero_telefono character varying, IN p_fecha_nacimiento date, IN p_genero character varying, IN p_persona_emergencia character varying, IN p_contacto_emergencia character varying, IN p_fecha_contratacion date, IN p_estado character varying, IN p_contrasena_encriptada character varying, IN p_role character varying)
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

CREATE PROCEDURE public.insertar_turno_trabajo(IN p_trabajador character varying, IN p_dias character varying, IN p_hora_entrada time without time zone, IN p_hora_salida time without time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Validate if worker exists
    IF NOT EXISTS (
        SELECT 1
        FROM personal
        WHERE carnet_identidad = p_trabajador
    ) THEN
        RAISE EXCEPTION 'El trabajador con CI % no existe en el sistema', p_trabajador
        USING ERRCODE = '23503'; -- foreign_key_violation
    END IF;

    -- Validate time format
    IF p_hora_entrada IS NULL OR p_hora_salida IS NULL THEN
        RAISE EXCEPTION 'La hora de entrada y salida son obligatorias'
        USING ERRCODE = '23502'; -- not_null_violation
    END IF;

    -- Validate that exit time is after entry time
    IF p_hora_salida <= p_hora_entrada THEN
        RAISE EXCEPTION 'La hora de salida debe ser posterior a la hora de entrada'
        USING ERRCODE = '23514'; -- check_violation
    END IF;

    -- Validate days is not empty
    IF p_dias IS NULL OR trim(p_dias) = '' THEN
        RAISE EXCEPTION 'Los días de trabajo son obligatorios'
        USING ERRCODE = '23502'; -- not_null_violation
    END IF;

    -- Check if worker already has a shift for any of these days
    IF EXISTS (
        SELECT 1
        FROM turno_trabajo
        WHERE trabajador = p_trabajador
        AND dias = p_dias
    ) THEN
        RAISE EXCEPTION 'El trabajador ya tiene un turno asignado para los días especificados'
        USING ERRCODE = '23505'; -- unique_violation
    END IF;

    -- Insert the new work shift
    INSERT INTO turno_trabajo (
        trabajador,
        dias,
        hora_entrada,
        hora_salida
    ) VALUES (
        p_trabajador,
        p_dias,
        p_hora_entrada,
        p_hora_salida
    );

	-- Confirm success
    RAISE NOTICE 'Turno asignado exitosamente.';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error al insertar turno: %', SQLERRM;

        RAISE;
END;
$$;

CREATE PROCEDURE public.register_attendance(IN p_ci_cliente character varying, IN p_metodo character varying, OUT p_result boolean, OUT p_message text, OUT p_days_remaining integer)
    LANGUAGE plpgsql
    AS $$
DECLARE
	v_cliente_exists BOOLEAN;
	v_subscription_exists BOOLEAN;
    v_valid_subscription BOOLEAN := FALSE;
    v_current_date DATE:= CURRENT_DATE;
    v_subscription_end DATE;
	v_last_sub_id INTEGER;
	v_last_entance DATE;
BEGIN
    -- Reset output parameters
    p_result := FALSE;
    p_days_remaining := 0;
    p_message := '';


	-- Check if client exists
	SELECT EXISTS (
        SELECT 1
        FROM cliente
        WHERE carnet_identidad = p_ci_cliente
    ) INTO v_cliente_exists;

    IF NOT v_cliente_exists THEN
        RAISE EXCEPTION 'Cliente no registrado aún.';
    END IF;

	-- Check if subs exists
		-- Check if client exists
	SELECT EXISTS (
        SELECT 1
        FROM subscripcion
        WHERE carnet_identidad_cliente = p_ci_cliente
    ) INTO v_subscription_exists;

    -- Check if an active subscription exists
    IF NOT v_subscription_exists THEN
        RAISE EXCEPTION 'Ninguna membresia encontrada para este cliente';
    END IF;


	--Check end date of the LAST subscription
	SELECT fecha_fin
	INTO v_subscription_end
	FROM subscripcion
	WHERE carnet_identidad_cliente = p_ci_cliente
	ORDER BY fecha_fin DESC
	LIMIT 1;

	-- Check if an active subscription exists
	IF v_subscription_end < v_current_date THEN
	   RAISE EXCEPTION 'La membresía ya expiró';
	END IF;

	--Check for days remaining
	SELECT entradas
	INTO p_days_remaining
	FROM subscripcion
	WHERE carnet_identidad_cliente = p_ci_cliente
	ORDER BY id DESC
	LIMIT 1;

	IF p_days_remaining IS NOT NULL THEN
		IF p_days_remaining <= 0 THEN
       		RAISE EXCEPTION 'Ya no quedan entradas en la membresía';
    	END IF;

		SELECT id
		INTO v_last_sub_id
		FROM subscripcion
		WHERE carnet_identidad_cliente = p_ci_cliente
		ORDER BY created_at DESC
		LIMIT 1;

		SELECT last_entrance_change
		INTO v_last_entance
		FROM subscripcion
		WHERE id = v_last_sub_id;

		IF v_last_entance IS NULL OR v_last_entance != CURRENT_DATE THEN

				-- Update the last change on entrance
				UPDATE subscripcion
		   		SET last_entrance_change = CURRENT_DATE
		   		WHERE id = v_last_sub_id;

				--Update the days remaining
				UPDATE subscripcion
			   	SET entradas = entradas - 1
			   	WHERE id = v_last_sub_id;

				p_days_remaining:= p_days_remaining - 1;
		END IF;
	END IF;


	-- Insert attendance record
    INSERT INTO asistencias (
        ci_cliente,
        hora_de_registro,
        metodo
    ) VALUES (
        p_ci_cliente,
        CURRENT_TIMESTAMP,
        p_metodo
    );




-- Debug values (optional, for development)
--RAISE NOTICE 'Calculating days remaining: v_subscription_end=% v_current_date=% p_days_remaining=%',
             -- v_subscription_end, v_current_date, p_days_remaining;


	IF p_days_remaining IS NULL THEN
		p_days_remaining := (v_subscription_end::date - CURRENT_DATE);
	END IF;


    -- Set successful result

    p_result := TRUE;
    p_message := 'Asistencia registrada exitosamente. ' || p_days_remaining || ' dias restantes en la membresia.';


EXCEPTION
    WHEN OTHERS THEN
        p_result := FALSE;
        p_message := SQLERRM;
        p_days_remaining := 0;
        RAISE;
END;
$$;

CREATE PROCEDURE public.sp_delete_subscription(IN p_carnet_identidad_cliente character varying, OUT p_success boolean, OUT p_message character varying)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_subscription_id INTEGER;
BEGIN
    -- Initialize output parameters
    p_success := FALSE;
    p_message := '';

    -- Get the ID of the most recent subscription for this client
    -- Note: Replace 'id' and 'created_at' with your actual column names
    SELECT id INTO v_subscription_id
    FROM subscripcion
    WHERE carnet_identidad_cliente = p_carnet_identidad_cliente
    ORDER BY created_at DESC  -- Or you might use 'id DESC' if id is auto-incremented
    LIMIT 1;

    -- Check if any record was found
    IF v_subscription_id IS NULL THEN
        p_message := 'Record not found';
        RETURN;
    END IF;

    -- Attempt to delete the specific record
    DELETE FROM subscripcion
    WHERE id = v_subscription_id
    AND carnet_identidad_cliente = p_carnet_identidad_cliente;

    -- Check if the deletion was successful
    IF FOUND THEN
        p_success := TRUE;
        p_message := 'Most recent subscription deleted successfully';
    ELSE
        p_success := FALSE;
        p_message := 'Failed to delete record';
    END IF;

EXCEPTION
    WHEN foreign_key_violation THEN
        p_success := FALSE;
        p_message := 'Cannot delete record due to foreign key constraints';
    WHEN OTHERS THEN
        p_success := FALSE;
        p_message := 'An unexpected error occurred: ' || SQLERRM;
END;
$$;

CREATE PROCEDURE public.update_dia_prueba_usado(IN p_carnet_identidad character varying)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_dia_prueba_usado BOOLEAN;
BEGIN
    -- Validate that the client exists and fetch the current status of dia_prueba_usado
    SELECT dia_prueba_usado
    INTO v_dia_prueba_usado
    FROM cliente
    WHERE carnet_identidad = p_carnet_identidad;

    -- If no record is found, raise an exception
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cliente con carnet_identidad % no encontrado.', p_carnet_identidad;
    END IF;

    -- Check if dia_prueba_usado is already TRUE
    IF v_dia_prueba_usado THEN
        RAISE EXCEPTION 'El día de prueba ya fue utilizado para el cliente con carnet_identidad %.', p_carnet_identidad;
    END IF;

    -- Update dia_prueba_usado to TRUE
    UPDATE cliente
    SET dia_prueba_usado = TRUE
    WHERE carnet_identidad = p_carnet_identidad;

    -- Confirm the update
    RAISE NOTICE 'El día de prueba ha sido marcado como utilizado para el cliente con carnet_identidad %.', p_carnet_identidad;

EXCEPTION
    WHEN OTHERS THEN
        -- Log and re-raise unexpected errors
        RAISE EXCEPTION 'Error al actualizar dia_prueba_usado: %', SQLERRM;
END;
$$;

CREATE FUNCTION public.update_modified_asistencia_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

SET default_tablespace = '';

SET default_table_access_method = heap;

CREATE TABLE public.cliente (
    carnet_identidad character varying(20) NOT NULL,
    nombre character varying(50) NOT NULL,
    apellido character varying(50) NOT NULL,
    correo character varying(100),
    numero_celular character varying(20),
    fecha_nacimiento date,
    genero character varying(10),
    persona_emergencia character varying(100),
    numero_emergencia character varying(20),
    dia_prueba_usado boolean DEFAULT false,
    foto bytea,
    estado character varying(10),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT cliente_correo_check CHECK (((correo)::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}$'::text))
);

CREATE TABLE public.subscripcion (
    id integer NOT NULL,
    carnet_identidad_cliente character varying(20) NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date NOT NULL,
    monto_pagado numeric(10,2) NOT NULL,
    descuento numeric(5,2) DEFAULT 0,
    descripcion_descuento character varying(200),
    metodo_pago character varying(10),
    inscrito_por character varying(20) NOT NULL,
    entradas integer,
    tipo character varying(200),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_entrance_change date,
    CONSTRAINT subscripcion_check CHECK ((fecha_fin >= fecha_inicio)),
    CONSTRAINT subscripcion_metodo_pago_check CHECK (((metodo_pago)::text = ANY (ARRAY[('efectivo'::character varying)::text, ('tarjeta'::character varying)::text, ('qr'::character varying)::text]))),
    CONSTRAINT subscripcion_monto_pagado_check CHECK ((monto_pagado >= (0)::numeric))
);

CREATE VIEW public.analisis_cliente_membresias AS
 SELECT c.carnet_identidad,
    concat(c.nombre, ' ', c.apellido) AS nombre_cliente,
    count(s.id) AS total_membresias,
    sum(s.monto_pagado) AS total_gastado,
    min(s.fecha_inicio) AS primera_membresia,
    max(s.fecha_inicio) AS ultima_membresia
   FROM (public.cliente c
     LEFT JOIN public.subscripcion s ON (((c.carnet_identidad)::text = (s.carnet_identidad_cliente)::text)))
  GROUP BY c.carnet_identidad, c.nombre, c.apellido;

CREATE TABLE public.asistencias (
    id integer NOT NULL,
    ci_cliente character varying(20) NOT NULL,
    hora_de_registro timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    metodo character varying(10) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT asistencias_metodo_check CHECK (((metodo)::text = ANY (ARRAY[('huella'::character varying)::text, ('carnet'::character varying)::text])))
);

CREATE SEQUENCE public.asistencias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.asistencias_id_seq OWNED BY public.asistencias.id;

CREATE TABLE public.maquina (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    marca character varying(50) NOT NULL,
    numero_serie character varying(50) NOT NULL,
    fecha_compra date NOT NULL,
    tiene_garantia boolean DEFAULT false,
    ultimo_mantenimiento date,
    estado character varying(20) NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT maquina_estado_check CHECK (((estado)::text = ANY (ARRAY[('en uso'::character varying)::text, ('mantenimiento'::character varying)::text])))
);

CREATE SEQUENCE public.maquina_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.maquina_id_seq OWNED BY public.maquina.id;

CREATE VIEW public.metricas_asistencias AS
 WITH rangos_fecha AS (
         SELECT CURRENT_DATE AS hoy,
            date_trunc('week'::text, (CURRENT_DATE)::timestamp with time zone) AS inicio_semana,
            date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone) AS inicio_mes,
            date_trunc('year'::text, (CURRENT_DATE)::timestamp with time zone) AS "inicio_año"
        )
 SELECT 'Hoy'::text AS periodo,
    count(*) AS asistencias_totales,
    count(DISTINCT a.ci_cliente) AS clientes
   FROM public.asistencias a
  WHERE (date_trunc('day'::text, a.hora_de_registro) = CURRENT_DATE)
UNION ALL
 SELECT 'Esta Semana'::text AS periodo,
    count(*) AS asistencias_totales,
    count(DISTINCT a.ci_cliente) AS clientes
   FROM public.asistencias a
  WHERE (date_trunc('week'::text, a.hora_de_registro) = date_trunc('week'::text, (CURRENT_DATE)::timestamp with time zone))
UNION ALL
 SELECT 'Este Mes'::text AS periodo,
    count(*) AS asistencias_totales,
    count(DISTINCT a.ci_cliente) AS clientes
   FROM public.asistencias a
  WHERE (date_trunc('month'::text, a.hora_de_registro) = date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone))
UNION ALL
 SELECT 'Este Año'::text AS periodo,
    count(*) AS asistencias_totales,
    count(DISTINCT a.ci_cliente) AS clientes
   FROM public.asistencias a
  WHERE (date_trunc('year'::text, a.hora_de_registro) = date_trunc('year'::text, (CURRENT_DATE)::timestamp with time zone));

CREATE VIEW public.metricas_asistencias_personalizado AS
 SELECT (date_trunc('day'::text, hora_de_registro))::date AS fecha,
    count(*) AS asistencias_totales,
    count(DISTINCT ci_cliente) AS clientes
   FROM public.asistencias
  GROUP BY ((date_trunc('day'::text, hora_de_registro))::date)
  ORDER BY ((date_trunc('day'::text, hora_de_registro))::date);

CREATE VIEW public.metricas_membresias AS
 WITH rangos_fecha AS (
         SELECT CURRENT_DATE AS hoy,
            date_trunc('week'::text, (CURRENT_DATE)::timestamp with time zone) AS inicio_semana,
            date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone) AS inicio_mes,
            date_trunc('year'::text, (CURRENT_DATE)::timestamp with time zone) AS "inicio_año"
        )
 SELECT 'Hoy'::text AS periodo,
    count(*) AS nuevas_membresias,
    COALESCE(sum(s.monto_pagado), (0)::numeric) AS ingresos_totales,
    count(*) FILTER (WHERE (s.fecha_fin = CURRENT_DATE)) AS membresias_vencidas
   FROM public.subscripcion s
  WHERE (date_trunc('day'::text, (s.fecha_inicio)::timestamp with time zone) = CURRENT_DATE)
UNION ALL
 SELECT 'Esta Semana'::text AS periodo,
    count(*) AS nuevas_membresias,
    COALESCE(sum(s.monto_pagado), (0)::numeric) AS ingresos_totales,
    count(*) FILTER (WHERE ((s.fecha_fin >= date_trunc('week'::text, (CURRENT_DATE)::timestamp with time zone)) AND (s.fecha_fin <= (date_trunc('week'::text, (CURRENT_DATE)::timestamp with time zone) + '7 days'::interval)))) AS membresias_vencidas
   FROM public.subscripcion s
  WHERE (date_trunc('week'::text, (s.fecha_inicio)::timestamp with time zone) = date_trunc('week'::text, (CURRENT_DATE)::timestamp with time zone))
UNION ALL
 SELECT 'Este Mes'::text AS periodo,
    count(*) AS nuevas_membresias,
    COALESCE(sum(s.monto_pagado), (0)::numeric) AS ingresos_totales,
    count(*) FILTER (WHERE ((s.fecha_fin >= date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone)) AND (s.fecha_fin <= (date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone) + '1 mon'::interval)))) AS membresias_vencidas
   FROM public.subscripcion s
  WHERE (date_trunc('month'::text, (s.fecha_inicio)::timestamp with time zone) = date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone))
UNION ALL
 SELECT 'Este Año'::text AS periodo,
    count(*) AS nuevas_membresias,
    COALESCE(sum(s.monto_pagado), (0)::numeric) AS ingresos_totales,
    count(*) FILTER (WHERE ((s.fecha_fin >= date_trunc('year'::text, (CURRENT_DATE)::timestamp with time zone)) AND (s.fecha_fin <= (date_trunc('year'::text, (CURRENT_DATE)::timestamp with time zone) + '1 year'::interval)))) AS membresias_vencidas
   FROM public.subscripcion s
  WHERE (date_trunc('year'::text, (s.fecha_inicio)::timestamp with time zone) = date_trunc('year'::text, (CURRENT_DATE)::timestamp with time zone));

CREATE VIEW public.metricas_membresias_personalizado AS
 SELECT fecha_inicio AS fecha,
    count(*) AS nuevas_membresias,
    COALESCE(sum(monto_pagado), (0)::numeric) AS ingresos_totales,
    count(*) FILTER (WHERE (fecha_fin = fecha_inicio)) AS membresias_vencidas
   FROM public.subscripcion
  GROUP BY fecha_inicio
  ORDER BY fecha_inicio;

CREATE TABLE public.personal (
    carnet_identidad character varying(20) NOT NULL,
    nombre character varying(50) NOT NULL,
    apellido character varying(50) NOT NULL,
    correo character varying(100),
    numero_telefono character varying(20),
    fecha_nacimiento date,
    genero character varying(10),
    persona_emergencia character varying(100),
    contacto_emergencia character varying(20),
    fecha_contratacion date NOT NULL,
    estado character varying(10),
    contrasena_encriptada character varying(255) NOT NULL,
    rol character varying(30),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT personal_correo_check CHECK (((correo)::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}$'::text)),
    CONSTRAINT personal_estado_check CHECK (((estado)::text = ANY (ARRAY[('activo'::character varying)::text, ('inactivo'::character varying)::text]))),
    CONSTRAINT personal_genero_check CHECK (((genero)::text = ANY (ARRAY[('masculino'::character varying)::text, ('femenino'::character varying)::text, ('otro'::character varying)::text])))
);

CREATE SEQUENCE public.subscripcion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.subscripcion_id_seq OWNED BY public.subscripcion.id;

CREATE TABLE public.turno_trabajo (
    id integer NOT NULL,
    trabajador character varying(20) NOT NULL,
    dias character varying(200) NOT NULL,
    hora_entrada time without time zone NOT NULL,
    hora_salida time without time zone NOT NULL,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    actualizado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT turno_trabajo_check CHECK ((hora_salida > hora_entrada))
);

CREATE SEQUENCE public.turno_trabajo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.turno_trabajo_id_seq OWNED BY public.turno_trabajo.id;

ALTER TABLE ONLY public.asistencias ALTER COLUMN id SET DEFAULT nextval('public.asistencias_id_seq'::regclass);

ALTER TABLE ONLY public.maquina ALTER COLUMN id SET DEFAULT nextval('public.maquina_id_seq'::regclass);

ALTER TABLE ONLY public.subscripcion ALTER COLUMN id SET DEFAULT nextval('public.subscripcion_id_seq'::regclass);

ALTER TABLE ONLY public.turno_trabajo ALTER COLUMN id SET DEFAULT nextval('public.turno_trabajo_id_seq'::regclass);

ALTER TABLE ONLY public.asistencias
    ADD CONSTRAINT asistencias_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.cliente
    ADD CONSTRAINT cliente_correo_key UNIQUE (correo);

ALTER TABLE ONLY public.cliente
    ADD CONSTRAINT cliente_pkey PRIMARY KEY (carnet_identidad);

ALTER TABLE ONLY public.maquina
    ADD CONSTRAINT maquina_numero_serie_key UNIQUE (numero_serie);

ALTER TABLE ONLY public.maquina
    ADD CONSTRAINT maquina_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.personal
    ADD CONSTRAINT personal_correo_key UNIQUE (correo);

ALTER TABLE ONLY public.personal
    ADD CONSTRAINT personal_pkey PRIMARY KEY (carnet_identidad);

ALTER TABLE ONLY public.subscripcion
    ADD CONSTRAINT subscripcion_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.turno_trabajo
    ADD CONSTRAINT turno_trabajo_pkey PRIMARY KEY (id);

CREATE INDEX idx_asistencias_ci_cliente ON public.asistencias USING btree (ci_cliente);

CREATE TRIGGER actualizar_maquina_modificacion BEFORE UPDATE ON public.maquina FOR EACH ROW EXECUTE FUNCTION public.actualizar_fecha_modificacion();

CREATE TRIGGER update_asistencias_modtime BEFORE UPDATE ON public.asistencias FOR EACH ROW EXECUTE FUNCTION public.update_modified_asistencia_column();

ALTER TABLE ONLY public.asistencias
    ADD CONSTRAINT asistencias_ci_cliente_fkey FOREIGN KEY (ci_cliente) REFERENCES public.cliente(carnet_identidad) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public.subscripcion
    ADD CONSTRAINT subscripcion_carnet_identidad_cliente_fkey FOREIGN KEY (carnet_identidad_cliente) REFERENCES public.cliente(carnet_identidad);

ALTER TABLE ONLY public.subscripcion
    ADD CONSTRAINT subscripcion_inscrito_por_fkey FOREIGN KEY (inscrito_por) REFERENCES public.personal(carnet_identidad);

ALTER TABLE ONLY public.turno_trabajo
    ADD CONSTRAINT turno_trabajo_trabajador_fkey FOREIGN KEY (trabajador) REFERENCES public.personal(carnet_identidad);
`);
};

exports.down = (pgm) => {
  pgm.sql(`
-- Reverse order: FK constraints, triggers, index, views, tables (CASCADE
-- also removes owned sequences/defaults/PK/UNIQUE/CHECK), leftover sequences,
-- procedures, then functions. All IF EXISTS so the down is idempotent.

ALTER TABLE IF EXISTS public.turno_trabajo DROP CONSTRAINT IF EXISTS turno_trabajo_trabajador_fkey;
ALTER TABLE IF EXISTS public.subscripcion DROP CONSTRAINT IF EXISTS subscripcion_inscrito_por_fkey;
ALTER TABLE IF EXISTS public.subscripcion DROP CONSTRAINT IF EXISTS subscripcion_carnet_identidad_cliente_fkey;
ALTER TABLE IF EXISTS public.asistencias DROP CONSTRAINT IF EXISTS asistencias_ci_cliente_fkey;

DROP TRIGGER IF EXISTS update_asistencias_modtime ON public.asistencias;
DROP TRIGGER IF EXISTS actualizar_maquina_modificacion ON public.maquina;

DROP INDEX IF EXISTS public.idx_asistencias_ci_cliente;

DROP VIEW IF EXISTS public.metricas_membresias_personalizado;
DROP VIEW IF EXISTS public.metricas_membresias;
DROP VIEW IF EXISTS public.metricas_asistencias_personalizado;
DROP VIEW IF EXISTS public.metricas_asistencias;
DROP VIEW IF EXISTS public.analisis_cliente_membresias;

DROP TABLE IF EXISTS public.turno_trabajo CASCADE;
DROP TABLE IF EXISTS public.asistencias CASCADE;
DROP TABLE IF EXISTS public.subscripcion CASCADE;
DROP TABLE IF EXISTS public.maquina CASCADE;
DROP TABLE IF EXISTS public.personal CASCADE;
DROP TABLE IF EXISTS public.cliente CASCADE;

DROP SEQUENCE IF EXISTS public.turno_trabajo_id_seq;
DROP SEQUENCE IF EXISTS public.subscripcion_id_seq;
DROP SEQUENCE IF EXISTS public.maquina_id_seq;
DROP SEQUENCE IF EXISTS public.asistencias_id_seq;

DROP PROCEDURE IF EXISTS public.update_dia_prueba_usado(character varying);
DROP PROCEDURE IF EXISTS public.sp_delete_subscription(character varying);
DROP PROCEDURE IF EXISTS public.register_attendance(character varying, character varying);
DROP PROCEDURE IF EXISTS public.insertar_turno_trabajo(character varying, character varying, time without time zone, time without time zone);
DROP PROCEDURE IF EXISTS public.insert_personal(character varying, character varying, character varying, character varying, character varying, date, character varying, character varying, character varying, date, character varying, character varying, character varying);
DROP PROCEDURE IF EXISTS public.insert_nuevo_cliente(character varying, character varying, character varying, character varying, character varying, date, character varying, character varying, character varying, bytea, character varying);
DROP PROCEDURE IF EXISTS public.insert_nueva_subscripcion(character varying, date, date, numeric, character varying, character varying, character varying, numeric, character varying, integer);

DROP FUNCTION IF EXISTS public.update_modified_asistencia_column();
DROP FUNCTION IF EXISTS public.actualizar_fecha_modificacion();
`);
};
