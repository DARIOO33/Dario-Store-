import pg from "pg";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const r = await pool.query(`select count(*)::int n from pg_stat_activity where datname = current_database() and client_addr is not null`);
console.log("app connections (incl. this one):", r.rows[0].n);
await pool.end();
