import fs from "fs";
import path from "path";
import pg from "pg";

export async function runMigrations(pool: pg.Pool) {
  const client = await pool.connect();
  try {
    // Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const migrationsDir = path.resolve(process.cwd(), "migrations");
    if (!fs.existsSync(migrationsDir)) {
      console.log("No migrations directory found.");
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const { rows } = await client.query("SELECT 1 FROM _migrations WHERE name = $1", [file]);
      if (rows.length === 0) {
        console.log(`Executing migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
        
        await client.query("BEGIN");
        try {
          await client.query(sql);
          await client.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
          await client.query("COMMIT");
          console.log(`Migration ${file} completed successfully.`);
        } catch (err) {
          await client.query("ROLLBACK");
          console.error(`Migration ${file} failed:`, err);
          throw err;
        }
      }
    }
  } finally {
    client.release();
  }
}
