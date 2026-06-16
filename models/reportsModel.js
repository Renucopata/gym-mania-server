const pool = require("../config/db");

const Report = {
  // Retrieve all attendances
  async getFullMemberships() {
    const query = "SELECT * FROM metricas_membresias;";
    const { rows } = await pool.query(query);
    return rows;
  },
  // Retrieve all attendances
  async getMembershipsByRange({dateA, dateB}) {
    const query = "SELECT * FROM metricas_membresias_personalizado WHERE fecha BETWEEN $1 AND $2;";
    const { rows } = await pool.query(query,[dateA, dateB]);
    return rows;
  },
  // Retrieve all attendances
  async getFullAttendances() {
    const query = "SELECT * FROM metricas_asistencias;";
    const { rows } = await pool.query(query);
    return rows;
  },
  // Retrieve all attendances
  async getAtendancesByRange({dateA, dateB}) {
    const query = "SELECT * FROM metricas_asistencias_personalizado WHERE fecha BETWEEN $1 AND $2;";
    const { rows } = await pool.query(query,[dateA, dateB]);
    return rows;
  },
  
  async getClient(ci) {
    const query = "SELECT * FROM analisis_cliente_membresias WHERE carnet_identidad = $1;";
    const { rows } = await pool.query(query,[ci]);
    return rows;
  },

 
};

module.exports = Report;