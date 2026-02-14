import { connectDB } from "../../utils/db.js";
import { redisCache } from "../../utils/redis.js";
import logger from "../../utils/logger.js";

/**
 * GET /api/admin/analytics/peak-hour
 * Calculates the peak hour of user visits in the last 7 days.
 */
export const getPeakHourAnalytics = async (req, res) => {
    try {
        const cacheKey = "analytics:peak_hour";
        const cacheDuration = 300; // 5 minutes

        const data = await redisCache(cacheKey, cacheDuration, async () => {
            const pool = await connectDB();
            
            // 1. Get visit counts for each hour (0-23) for the last 7 days
            // We use a LEFT JOIN with a helper sequence to ensure all 24 hours are present
            const [hourlyRaw] = await pool.execute(`
                WITH RECURSIVE hours AS (
                    SELECT 0 as h
                    UNION ALL
                    SELECT h + 1 FROM hours WHERE h < 23
                )
                SELECT 
                    h.h as hour,
                    COUNT(l.id) as total
                FROM hours h
                LEFT JOIN user_activity_logs l ON HOUR(l.visited_at) = h.h 
                    AND l.visited_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                GROUP BY h.h
                ORDER BY h.h ASC
            `);

            // 2. Find the peak hour
            let peakHour = 0;
            let maxVisits = 0;

            const hourlyData = hourlyRaw.map(row => {
                if (row.total > maxVisits) {
                    maxVisits = row.total;
                    peakHour = row.hour;
                }
                return {
                    hour: row.hour,
                    total: row.total
                };
            });

            const peakRange = `${peakHour.toString().padStart(2, '0')}:00 - ${(peakHour + 1).toString().padStart(2, '0')}:00`;

            return {
                peakHour,
                peakRange,
                totalVisits: maxVisits,
                hourlyData
            };
        });

        res.json(data);
    } catch (err) {
        logger.error("Failed to fetch peak hour analytics:", err);
        res.status(500).json({ error: "Lỗi hệ thống khi phân tích dữ liệu" });
    }
};
