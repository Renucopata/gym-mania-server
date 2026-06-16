// One-off bootstrap: create the FIRST admin staff account so you can log in and
// then add the rest of the employees through the UI. Safe to delete after use.
//
// WHY THIS EXISTS: registering staff (POST /api/auth/registerUser) requires a
// valid admin token, and logging in requires an existing row in `personal`.
// With an empty database that's a chicken-and-egg, so the first admin has to be
// inserted directly. This script does that the same way the app does (bcrypt
// cost 10 + the insert_personal stored procedure), so DB-side validation applies.
//
// PREREQUISITES: your Neon DB must already have the schema + the insert_personal
// stored procedure loaded. (The core schema/procedures are NOT in this repo.)
//
// USAGE:
//   1. Make sure gym-mania-server/.env has a valid DB_URL.
//   2. Edit the ADMIN object below (at minimum: ci, name, password).
//   3. From gym-mania-server/:   node scripts/seed-admin.js

require("dotenv").config();
const bcrypt = require("bcrypt");
const pool = require("../config/db");

const ADMIN = {
  ci: "6962308",              // carnet_identidad — this is your LOGIN username
  name: "Rene",
  lastname: "Rengel",
  email: "r.rengel99@gmail.com",
  cel: "65999740",
  bday: "1999-08-27",        // YYYY-MM-DD
  genre: "masculino",        // masculino | femenino | otro
  emergPerson: "N/A",
  emerContact: "65999740",
  hireDate: "2026-01-01",    // YYYY-MM-DD
  status: "activo",          // activo | inactivo
  password: "admin123",     // you will log in with this — change it
  role: "admin",             // admin | employee  (keep "admin" for the first one)
};

(async () => {
  try {
    const hash = await bcrypt.hash(ADMIN.password, 10);
    await pool.query(
      "CALL insert_personal($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)",
      [
        ADMIN.ci, ADMIN.name, ADMIN.lastname, ADMIN.email, ADMIN.cel,
        ADMIN.bday, ADMIN.genre, ADMIN.emergPerson, ADMIN.emerContact,
        ADMIN.hireDate, ADMIN.status, hash, ADMIN.role,
      ]
    );
    console.log(`\n✓ Admin creado.`);
    console.log(`  Usuario (CI): ${ADMIN.ci}`);
    console.log(`  Contraseña:   ${ADMIN.password}`);
    console.log(`\nYa puedes iniciar sesión y agregar empleados desde la app.\n`);
  } catch (err) {
    console.error("\n✗ No se pudo crear el admin:", err.message);
    console.error(
      "Si dice que insert_personal no existe, primero carga el esquema y los " +
      "procedimientos almacenados en tu base de datos de Neon.\n"
    );
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
