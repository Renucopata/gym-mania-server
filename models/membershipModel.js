const pool = require("../config/db");

// Columns on `subscripcion` that may be updated via the update endpoint.
// Excludes id (PK), carnet_identidad_cliente / inscrito_por (identity links),
// and created_at/updated_at (DB-managed). This is also the SQL-injection
// guard: only these identifiers are ever interpolated into the UPDATE.
const MEMBERSHIP_UPDATABLE_COLUMNS = [
  "fecha_inicio",
  "fecha_fin",
  "monto_pagado",
  "descuento",
  "descripcion_descuento",
  "metodo_pago",
  "tipo",
  "entradas",
];

const Membership = {
  async getAll() {
    const query = `
      SELECT 
          s.*,
          CONCAT(p.nombre, ' ', p.apellido) as inscrito_por_nombre
      FROM subscripcion s
      JOIN personal p ON s.inscrito_por = p.carnet_identidad 
      ORDER BY s.created_at DESC;
    `;
    const { rows } = await pool.query(query);
    return rows;
  },

  async getById(id) {
    const query = "SELECT * FROM subscripcion WHERE carnet_identidad_cliente = $1 ORDER By created_at DESC;";
    const { rows } = await pool.query(query, [id]);
    return rows;
  },
  async getOneById(id) {
    const query = `
    SELECT 
        s.*,
        CONCAT(c.nombre, ' ', c.apellido) as nombre_cliente
    FROM subscripcion s
    JOIN cliente c ON s.carnet_identidad_cliente = c.carnet_identidad 
    WHERE s.id = $1;
    `;
    const { rows } = await pool.query(query, [id]);
    return rows;
  },

  async create({ ci, start, end, amount, method, subBy, type, disc, descrDisc, entries }) {
    const query = `
      CALL insert_nueva_subscripcion(
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
       $10
  )`;
    const values = [ci, start, end, amount, method, subBy, type, disc, descrDisc, entries];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  async update(id, updates) {

    const columns = Object.keys(updates);

    if (columns.length === 0) {
      const err = new Error("No fields to update");
      err.code = "INVALID_UPDATE_BODY";
      throw err;
    }

    // Reject any column not in the whitelist before building SQL, so a
    // crafted JSON key can never reach the SET clause.
    const disallowed = columns.filter(
      (col) => !MEMBERSHIP_UPDATABLE_COLUMNS.includes(col)
    );
    if (disallowed.length > 0) {
      const err = new Error(
        `Campos no permitidos: ${disallowed.join(", ")}`
      );
      err.code = "DISALLOWED_UPDATE_FIELDS";
      throw err;
    }

    // Safe: every entry in `columns` is now a known whitelisted identifier.
    const setClauses = columns.map(
      (col, index) => `${col} = $${index + 1}`
    );
    const query = `
      UPDATE subscripcion
      SET ${setClauses.join(", ")}
      WHERE id = $${setClauses.length + 1}
      RETURNING *;
    `;
    const values = [...columns.map((col) => updates[col]), id];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  async remove(id) {
    const query = "DELETE FROM subscripcion WHERE id = $1;";
    const  {rows}  = await pool.query(query, [id]);
    return rows;
  },

  
};

module.exports = Membership;
