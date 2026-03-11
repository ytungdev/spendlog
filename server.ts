import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { runMigrations } from "./src/db/migrations.js";

dotenv.config();

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use DATABASE_URL from environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test database connection and run migrations
async function testConnection(retries = 5) {
  while (retries > 0) {
    try {
      const client = await pool.connect();
      console.log("PostgreSQL connected successfully");
      client.release();

      // Run standalone migrations
      await runMigrations(pool);
      console.log("Database migrations completed");
      
      return;
    } catch (err) {
      retries -= 1;
      console.error(`Failed to connect to PostgreSQL. Retries left: ${retries}`);
      if (retries === 0) {
        console.error("Final connection attempt failed. Ensure DATABASE_URL is correct and the server is reachable.");
        console.error(err);
      } else {
        await new Promise(res => setTimeout(res, 3000));
      }
    }
  }
}

testConnection();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

// API Routes

// Get all transactions
app.get("/api/transactions", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        t.id, 
        TO_CHAR(t.date, 'YYYY-MM-DD') as "date", 
        sc.category_name as "category", 
        c.color as "categoryColor",
        t.sub_category as "subCategory", 
        t.vendor, 
        t.description, 
        t.amount, 
        t.multiplier, 
        t.createdAt as "createdAt" 
      FROM transactions t
      JOIN sub_categories sc ON t.sub_category = sc.name
      JOIN categories c ON sc.category_name = c.name
      ORDER BY t.date DESC, t.createdAt DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("GET /api/transactions error:", err);
    res.status(500).json({ error: "Database error" });
  }
});


// Get all cats
app.get("/api/categories", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM categories");
    res.json(result.rows);
  } catch (err) {
    console.error("GET /api/categories error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Get all sub-cats
app.get("/api/sub-categories", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        sc.name, 
        sc.category_name as "categoryName",
        c.color as "categoryColor"
      FROM sub_categories sc
      JOIN categories c ON sc.category_name = c.name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("GET /api/sub-categories error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Update sub-cat.color
app.patch("/api/categories/:name", async (req, res) => {
  const { color } = req.body;
  try {
    await pool.query("UPDATE categories SET color = $1 WHERE name = $2", [color, req.params.name]);
    broadcast({ type: "CATEGORY_UPDATED", payload: { name: req.params.name, color } });
    res.status(204).end();
  } catch (err) {
    console.error("PATCH /api/categories/:name error:", err);
    res.status(500).json({ error: "Database error" });
  }
});


// Add new sub-cat
app.post("/api/sub-categories", async (req, res) => {
  const { name, categoryName } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO sub_categories (name, category_name) VALUES ($1, $2) RETURNING name, category_name as \"categoryName\"",
      [name, categoryName]
    );
    
    // Get category color
    const colorResult = await pool.query("SELECT color FROM categories WHERE name = $1", [categoryName]);
    const categoryColor = colorResult.rows[0]?.color || "#71717A";
    
    const newSubCategory = { ...result.rows[0], categoryColor };
    broadcast({ type: "SUB_CATEGORY_ADDED", payload: newSubCategory });
    res.json(newSubCategory);
  } catch (err) {
    console.error("POST /api/sub-categories error:", err);
    res.status(500).json({ error: "Database error" });
  }
});


// Add new transaction
app.post("/api/transactions", async (req, res) => {
  const { date, subCategory, vendor, description, amount, multiplier } = req.body;
  try {
    // Lookup category from sub_category (case-insensitive)
    const subCatResult = await pool.query(
      "SELECT category_name, name FROM sub_categories WHERE LOWER(name) = LOWER($1)", 
      [subCategory]
    );
    if (subCatResult.rows.length === 0) {
      return res.status(400).json({ error: "Invalid sub-category" });
    }
    const canonicalSubCategory = subCatResult.rows[0].name;
    const category = subCatResult.rows[0].category_name;

    const result = await pool.query(
      `INSERT INTO transactions (date, sub_category, vendor, description, amount, multiplier) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, TO_CHAR(date, 'YYYY-MM-DD') as "date", sub_category as "subCategory", vendor, description, amount, multiplier, createdAt as "createdAt"`,
      [date, canonicalSubCategory, vendor, description, amount, multiplier ?? 1]
    );
    
    // Get category color
    const colorResult = await pool.query(`
      SELECT c.color 
      FROM sub_categories sc
      JOIN categories c ON sc.category_name = c.name
      WHERE sc.name = $1
    `, [canonicalSubCategory]);
    const categoryColor = colorResult.rows[0]?.color || "#71717A";

    const newTransaction = { ...result.rows[0], category, categoryColor };
    
    // Broadcast to all clients
    broadcast({ type: "TRANSACTION_ADDED", payload: newTransaction });
    
    res.json(newTransaction);
  } catch (err) {
    console.error("POST /api/transactions error:", err);
    res.status(500).json({ error: "Database error" });
  }
});


// Remove transaction
app.delete("/api/transactions/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM transactions WHERE id = $1", [req.params.id]);
    broadcast({ type: "TRANSACTION_DELETED", payload: parseInt(req.params.id) });
    res.status(204).end();
  } catch (err) {
    console.error("DELETE /api/transactions/:id error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// WebSocket logic
function broadcast(data: any) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

wss.on("connection", (ws) => {
  console.log("Client connected via WebSocket");
});

// Vite middleware
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }
}

setupVite().then(() => {
  const PORT = 3000;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
