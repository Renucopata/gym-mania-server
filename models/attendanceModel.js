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
    const query = `
        SELECT 
            a.*,
          CONCAT(c.nombre, ' ', c.apellido) as nombre
        FROM asistencias a
        JOIN cliente c ON a.ci_cliente = c.carnet_identidad
        WHERE DATE(a.hora_de_registro) = CURRENT_DATE
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