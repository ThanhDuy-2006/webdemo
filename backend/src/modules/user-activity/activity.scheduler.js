import { connectDB } from "../../utils/db.js";

/**
 * Aggregates raw logs from user_activity_logs into user_activity_summary.
 * This should be run periodically (e.g., every 10 minutes).
 */
export const aggregateActivityLogs = async () => {
    try {
        const pool = await connectDB();
        console.log(`[${new Date().toISOString()}] [ActivityScheduler] Starting aggregation...`);

        // Using REPLACE INTO or INSERT ... ON DUPLICATE KEY UPDATE to sync summary
        // We calculate the latest stats per user and update the summary table
        await pool.execute(`
            INSERT INTO user_activity_summary (user_id, total_visits, last_visit_at, total_active_days)
            SELECT 
                user_id, 
                COUNT(*) as total_visits, 
                MAX(visited_at) as last_visit_at,
                COUNT(DISTINCT DATE(visited_at)) as total_active_days
            FROM user_activity_logs
            GROUP BY user_id
            ON DUPLICATE KEY UPDATE
                total_visits = VALUES(total_visits),
                last_visit_at = VALUES(last_visit_at),
                total_active_days = VALUES(total_active_days),
                updated_at = NOW()
        `);

        console.log(`[${new Date().toISOString()}] [ActivityScheduler] Aggregation completed.`);
    } catch (e) {
        console.error(`[${new Date().toISOString()}] [ActivityScheduler] Aggregation failed:`, e);
    }
};

/**
 * Starts the activity scheduler.
 */
export const startActivityScheduler = () => {
    // Run once at start
    aggregateActivityLogs();

    // Run every 10 minutes
    const INTERVAL = 10 * 60 * 1000;
    setInterval(aggregateActivityLogs, INTERVAL);
    
    console.log("🕒 User Activity Scheduler started (10 minute interval)");
};
