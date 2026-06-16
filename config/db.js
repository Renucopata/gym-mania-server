const { Pool } = require("pg");
require('dotenv').config();

if (!process.env.DB_URL || process.env.DB_URL.trim() === "") {
  throw new Error(
    "DB_URL is not set. The app always connects to Neon over SSL, so you " +
    "must define DB_URL (a Postgres connection string including " +
    "?sslmode=require)."
  );
}

const pool = new Pool({
  connectionString: process.env.DB_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = pool;


