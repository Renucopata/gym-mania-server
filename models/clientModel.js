const pool = require("../config/db");

// Columns on `cliente` that may be updated via the generic update endpoint.
// Excludes carnet_identidad (PK/identity), foto (own upload endpoint),
// dia_prueba_usado (own endpoint), and created_at/updated_at (DB-managed).
// This is also the SQL-injection guard: only these identifiers are ever
// interpolated into the UPDATE statement.
const CLIENT_UPDATABLE_COLUMNS = [
  "nombre",
  "apellido",
  "correo",
  "numero_celular",
  "fecha_nacimiento",
  "genero",
  "persona_emergencia",
  "numero_emergencia",
  "estado",
];

const Client = {
  // Get all clients
  async getAll() {
    const query = "SELECT * FROM public.cliente ORDER BY created_at DESC;";
    const { rows } = await pool.query(query);
    return rows;
  },

    // Get one clients
    async getOne(ci) {
      const query = `
        SELECT 
              carnet_identidad,
              nombre,
              apellido,
              correo,
              numero_celular,
              fecha_nacimiento,
              genero,
              persona_emergencia,
              numero_emergencia,
              dia_prueba_usado,
              estado,
              created_at,
              updated_at
          FROM cliente
          WHERE carnet_identidad = $1;
      `;
      const { rows } = await pool.query(query, [ci]);
      return rows;
    },

  // Add a new client
  async create({ ci, name, lastName, email, cell, bday, gnre, emergCntc, emergCell, photo, status }){
    const query =  `CALL insert_nuevo_cliente(
    $1,
    $2,
    $3,
    $4,
    $5,
    $6,
    $7,
    $8,
    $9,
    $10,
    $11
) `;
    const values = [ci, name, lastName, email, cell, bday, gnre, emergCntc, emergCell, photo, status];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  async tryDay(ci) {
    const query = "CALL update_dia_prueba_usado($1); ";
    const {rows} = await pool.query(query, [ci]);
    console.log(rows[0]);
    return rows[0];
  },


  async savePhoto(ci, photoBuffer) {
    const query = `
      UPDATE cliente
      SET foto = $1
      WHERE carnet_identidad = $2;
    `;
    await pool.query(query, [photoBuffer, ci]);
  },

  // Retrieve a photo from the database
  async getPhoto(ci) {
    const query = `
      SELECT foto
      FROM cliente
      WHERE carnet_identidad = $1;
    `;
    const {rows} = await pool.query(query, [ci]);
    return rows[0]?.foto; // Return the binary data of the photo
  },

  // Update a client
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
      (col) => !CLIENT_UPDATABLE_COLUMNS.includes(col)
    );
    if (disallowed.length > 0) {
      const err = new Error(
        `Campos no permitidos: ${disallowed.join(", ")}`
      );
      err.code = "DISALLOWED_UPDATE_FIELDS";
      throw err;
    }

    // Safe: every entry in `columns` is now a known whitelisted identifier.
    const values = columns.map((col) => updates[col]);
    const setClause = columns
      .map((col, index) => `${col} = $${index + 1}`)
      .join(", ");

    const query = `
      UPDATE cliente
      SET ${setClause}
      WHERE carnet_identidad = $${columns.length + 1}
      RETURNING *;
    `;

    // Append the ID as the last parameter
    const result = await pool.query(query, [...values, id]);
    return result.rows[0];
  },

  // Delete a client. Membership/attendance history is kept for reports:
  // before the row is removed, matching subscripcion/asistencias rows are
  // stamped with a snapshot of the client's carnet_identidad and name, since
  // the FK will set their reference column to NULL once cliente is gone.
  async remove(ci) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `UPDATE subscripcion
            SET cliente_eliminado = true,
                carnet_identidad_cliente_eliminado = $1,
                nombre_cliente_eliminado = (
                  SELECT concat(nombre, ' ', apellido) FROM cliente WHERE carnet_identidad = $1
                )
          WHERE carnet_identidad_cliente = $1;`,
        [ci]
      );

      await client.query(
        `UPDATE asistencias
            SET cliente_eliminado = true,
                ci_cliente_eliminado = $1,
                nombre_cliente_eliminado = (
                  SELECT concat(nombre, ' ', apellido) FROM cliente WHERE carnet_identidad = $1
                )
          WHERE ci_cliente = $1;`,
        [ci]
      );

      const { rows } = await client.query(
        "DELETE FROM cliente WHERE carnet_identidad = $1 RETURNING *;",
        [ci]
      );

      await client.query("COMMIT");
      return rows[0];
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

};

module.exports = Client;
