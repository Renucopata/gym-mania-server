const pool = require("../config/db");

async function createSubmission({ nombre, email, telefono, mensaje, source }) {
  const result = await pool.query(
    `INSERT INTO public.contact_submission
       (nombre, email, telefono, mensaje, source)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, created_at`,
    [nombre, email, telefono || null, mensaje, source || null]
  );
  return result.rows[0];
}

async function listSubmissions({ status, assignedTo, limit = 50, offset = 0 }) {
  const conditions = [];
  const params = [];
  let p = 1;

  if (status) {
    conditions.push(`cs.status = $${p++}`);
    params.push(status);
  }
  if (assignedTo === "unassigned") {
    conditions.push(`cs.assigned_to IS NULL`);
  } else if (assignedTo) {
    conditions.push(`cs.assigned_to = $${p++}`);
    params.push(assignedTo);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  params.push(limit, offset);

  const result = await pool.query(
    `SELECT cs.id, cs.nombre, cs.email, cs.telefono, cs.mensaje,
            cs.status, cs.assigned_to, cs.source,
            cs.created_at, cs.updated_at,
            p.nombre AS assigned_to_nombre, p.apellido AS assigned_to_apellido
     FROM public.contact_submission cs
     LEFT JOIN public.personal p ON p.carnet_identidad = cs.assigned_to
     ${where}
     ORDER BY cs.created_at DESC
     LIMIT $${p++} OFFSET $${p++}`,
    params
  );
  return result.rows;
}

async function findById(id) {
  const result = await pool.query(
    `SELECT cs.*, p.nombre AS assigned_to_nombre, p.apellido AS assigned_to_apellido
     FROM public.contact_submission cs
     LEFT JOIN public.personal p ON p.carnet_identidad = cs.assigned_to
     WHERE cs.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

// Whitelist-based update: only `status` and `assigned_to` are mutable.
async function update(id, fields) {
  const allowed = ["status", "assigned_to"];
  const setClauses = [];
  const params = [];
  let p = 1;

  for (const key of allowed) {
    if (key in fields) {
      setClauses.push(`${key} = $${p++}`);
      params.push(fields[key]);
    }
  }

  if (setClauses.length === 0) {
    const err = new Error("No valid update fields");
    err.code = "INVALID_UPDATE_BODY";
    throw err;
  }

  params.push(id);
  const result = await pool.query(
    `UPDATE public.contact_submission
     SET ${setClauses.join(", ")}
     WHERE id = $${p}
     RETURNING *`,
    params
  );
  return result.rows[0] || null;
}

module.exports = { createSubmission, listSubmissions, findById, update };
