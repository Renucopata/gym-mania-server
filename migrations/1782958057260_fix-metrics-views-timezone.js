/* eslint-disable camelcase */

// Migration M9 — the dashboard metrics views compared timestamptz instants
// (asistencias.hora_de_registro) against CURRENT_DATE using the session's
// default timezone (UTC on Neon), not the gym's actual timezone
// (America/La_Paz, UTC-4). Since UTC's calendar day rolls over at 8pm local,
// "Hoy"/"Esta Semana"/etc. would silently drop check-ins registered earlier
// the same local day once that rollover passed — the same bug fixed for
// attendanceModel.getDayAttendances in the app code, but baked into these
// views' SQL instead.
//
// metricas_membresias compares fecha_inicio/fecha_fin (plain `date`, not
// timestamptz) against CURRENT_DATE, so there's no instant-to-day conversion
// on that side — but CURRENT_DATE itself is still evaluated in the wrong
// timezone, which matters right at the local day boundary. Fixed by deriving
// "today" from CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz' instead, and
// comparing directly against the plain date column (dropping the unnecessary
// date::timestamptz round-trip the original view used).

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
CREATE OR REPLACE VIEW public.metricas_asistencias AS
 SELECT 'Hoy'::text AS periodo,
    count(*) AS asistencias_totales,
    count(DISTINCT a.ci_cliente) AS clientes
   FROM public.asistencias a
  WHERE (date_trunc('day', a.hora_de_registro AT TIME ZONE 'America/La_Paz')
       = date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz'))
UNION ALL
 SELECT 'Esta Semana'::text AS periodo,
    count(*) AS asistencias_totales,
    count(DISTINCT a.ci_cliente) AS clientes
   FROM public.asistencias a
  WHERE (date_trunc('week', a.hora_de_registro AT TIME ZONE 'America/La_Paz')
       = date_trunc('week', CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz'))
UNION ALL
 SELECT 'Este Mes'::text AS periodo,
    count(*) AS asistencias_totales,
    count(DISTINCT a.ci_cliente) AS clientes
   FROM public.asistencias a
  WHERE (date_trunc('month', a.hora_de_registro AT TIME ZONE 'America/La_Paz')
       = date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz'))
UNION ALL
 SELECT 'Este Año'::text AS periodo,
    count(*) AS asistencias_totales,
    count(DISTINCT a.ci_cliente) AS clientes
   FROM public.asistencias a
  WHERE (date_trunc('year', a.hora_de_registro AT TIME ZONE 'America/La_Paz')
       = date_trunc('year', CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz'));

CREATE OR REPLACE VIEW public.metricas_asistencias_personalizado AS
 SELECT (hora_de_registro AT TIME ZONE 'America/La_Paz')::date AS fecha,
    count(*) AS asistencias_totales,
    count(DISTINCT ci_cliente) AS clientes
   FROM public.asistencias
  GROUP BY ((hora_de_registro AT TIME ZONE 'America/La_Paz')::date)
  ORDER BY ((hora_de_registro AT TIME ZONE 'America/La_Paz')::date);

CREATE OR REPLACE VIEW public.metricas_membresias AS
 WITH hoy_local AS (
    SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz')::date AS hoy
 )
 SELECT 'Hoy'::text AS periodo,
    count(*) AS nuevas_membresias,
    COALESCE(sum(s.monto_pagado), (0)::numeric) AS ingresos_totales,
    count(*) FILTER (WHERE (s.fecha_fin = h.hoy)) AS membresias_vencidas
   FROM public.subscripcion s, hoy_local h
  WHERE (s.fecha_inicio = h.hoy)
UNION ALL
 SELECT 'Esta Semana'::text AS periodo,
    count(*) AS nuevas_membresias,
    COALESCE(sum(s.monto_pagado), (0)::numeric) AS ingresos_totales,
    count(*) FILTER (WHERE (s.fecha_fin >= date_trunc('week', h.hoy::timestamp)
                        AND s.fecha_fin <= (date_trunc('week', h.hoy::timestamp) + '7 days'::interval))) AS membresias_vencidas
   FROM public.subscripcion s, hoy_local h
  WHERE (date_trunc('week', s.fecha_inicio::timestamp) = date_trunc('week', h.hoy::timestamp))
UNION ALL
 SELECT 'Este Mes'::text AS periodo,
    count(*) AS nuevas_membresias,
    COALESCE(sum(s.monto_pagado), (0)::numeric) AS ingresos_totales,
    count(*) FILTER (WHERE (s.fecha_fin >= date_trunc('month', h.hoy::timestamp)
                        AND s.fecha_fin <= (date_trunc('month', h.hoy::timestamp) + '1 mon'::interval))) AS membresias_vencidas
   FROM public.subscripcion s, hoy_local h
  WHERE (date_trunc('month', s.fecha_inicio::timestamp) = date_trunc('month', h.hoy::timestamp))
UNION ALL
 SELECT 'Este Año'::text AS periodo,
    count(*) AS nuevas_membresias,
    COALESCE(sum(s.monto_pagado), (0)::numeric) AS ingresos_totales,
    count(*) FILTER (WHERE (s.fecha_fin >= date_trunc('year', h.hoy::timestamp)
                        AND s.fecha_fin <= (date_trunc('year', h.hoy::timestamp) + '1 year'::interval))) AS membresias_vencidas
   FROM public.subscripcion s, hoy_local h
  WHERE (date_trunc('year', s.fecha_inicio::timestamp) = date_trunc('year', h.hoy::timestamp));
`);
};

exports.down = (pgm) => {
  pgm.sql(`
CREATE OR REPLACE VIEW public.metricas_asistencias AS
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

CREATE OR REPLACE VIEW public.metricas_asistencias_personalizado AS
 SELECT (date_trunc('day'::text, hora_de_registro))::date AS fecha,
    count(*) AS asistencias_totales,
    count(DISTINCT ci_cliente) AS clientes
   FROM public.asistencias
  GROUP BY ((date_trunc('day'::text, hora_de_registro))::date)
  ORDER BY ((date_trunc('day'::text, hora_de_registro))::date);

CREATE OR REPLACE VIEW public.metricas_membresias AS
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
`);
};
