const pool = require("../config/db");

const User = {
  async findByUser(user) {
    const query = "SELECT carnet_identidad, nombre, contrasena_encriptada, rol FROM public.personal WHERE carnet_identidad = $1;";
    const result = await pool.query(query, [user]);
    return result.rows[0];
  },
  
  async create({ ci, name, lastname, email, cel, bday, genre, emergPerson, emerContact, hireDate, status, pwd, role }) {
    const query = "CALL insert_personal($1, $2, $3,$4, $5, $6, $7, $8, $9, $10, $11, $12, $13)";
    const result = await pool.query(query, [ ci, name, lastname, email, cel, bday, genre, emergPerson, emerContact, hireDate, status, pwd, role]);
    return result.rows[0];
  },
  async getAll() {
    const query = "SELECT * FROM personal ORDER BY created_at DESC;";
    const { rows } = await pool.query(query);
    return rows;
  },

  async getByCi(ci) {
    const query = `
      SELECT 
            carnet_identidad,
            nombre,
            apellido,
            correo,
            numero_telefono,
            fecha_nacimiento,
            genero,
            persona_emergencia,
            contacto_emergencia,
            fecha_contratacion,
            rol,
            created_at,
            updated_at
        FROM personal
        WHERE carnet_identidad = $1;
    `;
    const { rows } = await pool.query(query, [ci]);
    return rows;
  },

  async getShift(ci) {
    const query = `
      SELECT 
            *
        FROM turno_trabajo
        WHERE trabajador = $1;
    `;
    const { rows } = await pool.query(query, [ci]);
    return rows;
  },

  async addShift({ci, days, entrance, exit}) {
    const query = `
      CALL insertar_turno_trabajo(
          $1,           -- carnet_identidad del trabajador
          $2,       -- días
          $3,     -- hora entrada
          $4     -- hora salida
      );
    `;
    const { rows } = await pool.query(query, [ci, days, entrance, exit]);
    console.log()
    return rows;
  },

  async removeShift(id) {
    const query = "DELETE FROM turno_trabajo WHERE id = $1";
    const { rows } = await pool.query(query, [id]);
    return rows;
  },

  async removeEmployee(id) {
    const query = "DELETE FROM personal WHERE carnet_identidad = $1";
    const { rows } = await pool.query(query, [id]);
    return rows;
  },


};

module.exports = User;

