
import { sql, connectDB } from "../src/utils/db.js";
import dotenv from "dotenv";
dotenv.config();

async function run() {
    try {
        const pool = await connectDB();
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('users') AND name = 'theme_config')
            BEGIN
                ALTER TABLE users ADD theme_config NVARCHAR(MAX) NULL;
                PRINT 'Added theme_config column';
            END
            ELSE
            BEGIN
                PRINT 'theme_config column already exists';
            END
        `);
        console.log("Migration complete");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
