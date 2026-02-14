import { connectDB } from "../utils/db.js";
import { getRedisClient } from "../utils/redis.js";
import logger from "../utils/logger.js";

const LOG_INTERVAL = 10 * 60; // 10 minutes in seconds

/**
 * Middleware to track user activity.
 * Records user_id and visited_at.
 * Throttled to once every 10 minutes per user using Redis for scale support.
 */
export const trackUserActivity = (req, res, next) => {
    // We listen for the 'finish' event to respect the "don't log on 401" rule
    res.on('finish', async () => {
        try {
            // 1. Only log if user is authenticated
            if (!req.user || !req.user.id) return;

            // 2. Don't log if request failed with 401 (Unauthorized)
            if (res.statusCode === 401) return;

            const userId = req.user.id;
            const redis = getRedisClient();

            if (redis && redis.isReady) {
                const cacheKey = `activity:debounce:${userId}`;
                const exists = await redis.get(cacheKey);
                
                if (exists) return; // Recently logged

                // Set debounce flag in Redis
                await redis.setEx(cacheKey, LOG_INTERVAL, "1");
            } else {
                // Fallback to in-memory if Redis is down (less accurate on multiple instances but better than nothing)
                // However, for pure performance, we could skip or just log. 
                // Given the instructions, we'll try to log.
            }

            // 3. Log to Database
            const pool = await connectDB();
            
            // Log the raw activity (minimal columns as requested)
            await pool.execute(
                "INSERT INTO user_activity_logs (user_id, visited_at) VALUES (?, NOW())",
                [userId]
            );

            // 4. Update summary (Total visits and last visit)
            await pool.execute(
                `INSERT INTO user_activity_summary (user_id, last_visit_at, total_visits) 
                 VALUES (?, NOW(), 1) 
                 ON DUPLICATE KEY UPDATE 
                    last_visit_at = NOW(), 
                    total_visits = total_visits + 1,
                    updated_at = NOW()`,
                [userId]
            );

        } catch (err) {
            // Silently fail logging errors to avoid disrupting the main request path
            logger.error("[ActivityTracker] Failed to log activity:", err);
        }
    });

    next();
};
