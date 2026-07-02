/* eslint-disable camelcase */

// Migration M8 — let a cliente row be deleted even when it still has
// subscripcion/asistencias history, without losing that history for reports.
//
// Before this migration, subscripcion.carnet_identidad_cliente and
// asistencias.ci_cliente were NOT NULL with a FK that defaults to RESTRICT
// (asistencias was explicit RESTRICT), so DELETE FROM cliente always failed
// with a foreign key violation once a client had a single membership or
// attendance record — i.e. almost always.
//
// up:
//   - Make both FK columns nullable and switch the FK to ON DELETE SET NULL,
//     so deleting a client no longer fails.
//   - Add cliente_eliminado + snapshot columns (original carnet_identidad and
//     full name) on both tables, filled in at delete time, since once the FK
//     nulls the column the row can't be joined back to cliente any more.
//   - Recreate analisis_cliente_membresias so a deleted client's aggregated
//     membership history still shows up (via the snapshot columns) when
//     queried by their original carnet_identidad.
// down:
//   - Restore the original view and FK behavior, and drop the new columns.
//     Will fail if any row already has a NULL FK column (expected: that data
//     loss can't be cleanly undone).

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
ALTER TABLE public.subscripcion
  ALTER COLUMN carnet_identidad_cliente DROP NOT NULL,
  ADD COLUMN cliente_eliminado boolean NOT NULL DEFAULT false,
  ADD COLUMN carnet_identidad_cliente_eliminado character varying(20),
  ADD COLUMN nombre_cliente_eliminado character varying(101);

ALTER TABLE public.subscripcion
  DROP CONSTRAINT subscripcion_carnet_identidad_cliente_fkey,
  ADD CONSTRAINT subscripcion_carnet_identidad_cliente_fkey
    FOREIGN KEY (carnet_identidad_cliente)
    REFERENCES public.cliente(carnet_identidad)
    ON DELETE SET NULL;

ALTER TABLE public.asistencias
  ALTER COLUMN ci_cliente DROP NOT NULL,
  ADD COLUMN cliente_eliminado boolean NOT NULL DEFAULT false,
  ADD COLUMN ci_cliente_eliminado character varying(20),
  ADD COLUMN nombre_cliente_eliminado character varying(101);

ALTER TABLE public.asistencias
  DROP CONSTRAINT asistencias_ci_cliente_fkey,
  ADD CONSTRAINT asistencias_ci_cliente_fkey
    FOREIGN KEY (ci_cliente)
    REFERENCES public.cliente(carnet_identidad)
    ON UPDATE CASCADE ON DELETE SET NULL;

CREATE OR REPLACE VIEW public.analisis_cliente_membresias AS
 SELECT c.carnet_identidad,
    concat(c.nombre, ' ', c.apellido) AS nombre_cliente,
    count(s.id) AS total_membresias,
    sum(s.monto_pagado) AS total_gastado,
    min(s.fecha_inicio) AS primera_membresia,
    max(s.fecha_inicio) AS ultima_membresia
   FROM public.cliente c
   LEFT JOIN public.subscripcion s
     ON c.carnet_identidad = s.carnet_identidad_cliente
  GROUP BY c.carnet_identidad, c.nombre, c.apellido
UNION ALL
 SELECT s.carnet_identidad_cliente_eliminado AS carnet_identidad,
    s.nombre_cliente_eliminado AS nombre_cliente,
    count(s.id) AS total_membresias,
    sum(s.monto_pagado) AS total_gastado,
    min(s.fecha_inicio) AS primera_membresia,
    max(s.fecha_inicio) AS ultima_membresia
   FROM public.subscripcion s
  WHERE s.cliente_eliminado = true
  GROUP BY s.carnet_identidad_cliente_eliminado, s.nombre_cliente_eliminado;
`);
};

exports.down = (pgm) => {
  pgm.sql(`
CREATE OR REPLACE VIEW public.analisis_cliente_membresias AS
 SELECT c.carnet_identidad,
    concat(c.nombre, ' ', c.apellido) AS nombre_cliente,
    count(s.id) AS total_membresias,
    sum(s.monto_pagado) AS total_gastado,
    min(s.fecha_inicio) AS primera_membresia,
    max(s.fecha_inicio) AS ultima_membresia
   FROM public.cliente c
   LEFT JOIN public.subscripcion s
     ON c.carnet_identidad = s.carnet_identidad_cliente
  GROUP BY c.carnet_identidad, c.nombre, c.apellido;

ALTER TABLE public.asistencias
  DROP CONSTRAINT asistencias_ci_cliente_fkey,
  ADD CONSTRAINT asistencias_ci_cliente_fkey
    FOREIGN KEY (ci_cliente)
    REFERENCES public.cliente(carnet_identidad)
    ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.asistencias
  DROP COLUMN cliente_eliminado,
  DROP COLUMN ci_cliente_eliminado,
  DROP COLUMN nombre_cliente_eliminado,
  ALTER COLUMN ci_cliente SET NOT NULL;

ALTER TABLE public.subscripcion
  DROP CONSTRAINT subscripcion_carnet_identidad_cliente_fkey,
  ADD CONSTRAINT subscripcion_carnet_identidad_cliente_fkey
    FOREIGN KEY (carnet_identidad_cliente)
    REFERENCES public.cliente(carnet_identidad);

ALTER TABLE public.subscripcion
  DROP COLUMN cliente_eliminado,
  DROP COLUMN carnet_identidad_cliente_eliminado,
  DROP COLUMN nombre_cliente_eliminado,
  ALTER COLUMN carnet_identidad_cliente SET NOT NULL;
`);
};
