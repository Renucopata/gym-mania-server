const pool = require("./db.js");

(async () => {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("Database connected successfully:", res.rows[0]);
  } catch (err) {
    console.error("Database connection error:", err);
  } finally {
    pool.end();
  }
})();
