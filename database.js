import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

pool.on("connect", () => {
  console.log("PostgreSQL connected");
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});

// Test connection when pool is created
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Database connection error:", err.message);
  } else {
    console.log("Database connection successful:", res.rows[0]);
  }
});

export default pool;
