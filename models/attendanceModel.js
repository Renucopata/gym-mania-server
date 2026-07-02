const pool = require("../config/db");

const Attendance = {
  // Retrieve all attendances
  async getAll() {
    const query = "SELECT * FROM asistencias ORDER BY created_at DESC;";
    const { rows } = await pool.query(query);
    return rows;
  },

  //Retrieve today attendances
  async getDayAttendances() {
    // The gym operates in America/La_Paz (UTC-4); hora_de_registro is stored
    // as timestamptz (an absolute instant). Comparing via the session's
    // default timezone (UTC on Neon) makes "today" roll over ~8pm local time,
    // silently dropping earlier same-day check-ins from this query. Convert
    // both sides to the gym's local calendar date explicitly instead.
    const query = `
        SELECT
            a.*,
          CONCAT(c.nombre, ' ', c.apellido) as nombre
        FROM asistencias a
        JOIN cliente c ON a.ci_cliente = c.carnet_identidad
        WHERE (a.hora_de_registro AT TIME ZONE 'America/La_Paz')::date =
              (CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz')::date
        ORDER BY a.hora_de_registro DESC;
      `;
    const { rows } = await pool.query(query);
    return rows;
  },


  // Retrieve attendance by ID
  async getByCi(id) {
    const query = "SELECT * FROM asistencias WHERE ci_cliente = $1;";
    const { rows } = await pool.query(query, [id]);
    return rows;
  },

  // Add a new attendance
  async create({ ci, method }) {
    const query = `
      CALL register_attendance(
	      $1,
	      $2,
	      NULL,
	      NULL,
	      NULL
      );
    `;
    const values = [ci, method ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  // Delete an attendance by ID
  async remove(id) {
    const query = "DELETE FROM asistencias WHERE id = $1;";
    const { rowCount } = await pool.query(query, [id]);
    return rowCount;
  },
};

module.exports = Attendance;