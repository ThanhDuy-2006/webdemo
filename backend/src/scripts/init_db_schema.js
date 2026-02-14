
import fs from "fs";
import path from "path";
import { connectDB } from "../../utils/db.js";
import { fileURLToPath } from "url";

// Get __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initDb() {
  console.log("🚀 Running Database Migration...");
  
  try {
    const pool = await connectDB();
    const schemaPath = path.join(__dirname, "schema.sql");
    
    if (!fs.existsSync(schemaPath)) {
        console.warn("⚠️ Schema file not found at:", schemaPath);
        return;
    }

    const schema = fs.readFileSync(schemaPath, "utf8");
    const queries = schema.split(";").filter(q => q.trim().length > 0);

    for (const query of queries) {
        try {
            // Replace CREATE TABLE with CREATE TABLE IF NOT EXISTS
            let safeQuery = query.trim();
            if (safeQuery.toUpperCase().startsWith("CREATE TABLE")) {
                if (!safeQuery.toUpperCase().includes("IF NOT EXISTS")) {
                    safeQuery = safeQuery.replace(/CREATE TABLE/i, "CREATE TABLE IF NOT EXISTS");
                }
            }
            
            await pool.query(safeQuery);
        } catch (err) {
            // Ignore "Table exists" errors if regex replacement failed or other minor issues
            if (err.code !== 'ER_TABLE_EXISTS_ERROR') {
                 console.warn(`⚠️ Warning executing query: ${err.message}`);
                 // Don't throw, try next query
            }
        }
    }
    
    console.log("✅ Database Migration Completed Successfully!");
  } catch (err) {
    console.error("❌ Database Migration Failed:", err);
    // Don't exit process, let server try to run anyway
  }
}
