const pool = require("../config/db");

async function findByEmail(emailLower) {
  const result = await pool.query(
    `SELECT ma.carnet_identidad, ma.email_lower, ma.password_hash,
            c.nombre, c.apellido, c.estado
       FROM public.member_auth ma
       JOIN public.cliente c ON c.carnet_identidad = ma.carnet_identidad
      WHERE ma.email_lower = $1`,
    [emailLower]
  );
  return result.rows[0] || null;
}

async function findByCarnet(carnet) {
  const result = await pool.query(
    `SELECT ma.carnet_identidad, ma.email_lower,
            c.nombre, c.apellido, c.correo, c.numero_celular,
            c.fecha_nacimiento, c.genero, c.estado
       FROM public.member_auth ma
       JOIN public.cliente c ON c.carnet_identidad = ma.carnet_identidad
      WHERE ma.carnet_identidad = $1`,
    [carnet]
  );
  return result.rows[0] || null;
}

async function callRegisterMember(args) {
  await pool.query(
    `CALL public.register_member($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      args.carnet_identidad,
      args.nombre,
      args.apellido,
      args.email,
      args.password_hash,
      args.numero_celular,
      args.fecha_nacimiento,
      args.genero,
    ]
  );
}

module.exports = { findByEmail, findByCarnet, callRegisterMember };
