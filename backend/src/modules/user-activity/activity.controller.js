import { connectDB } from "../../utils/db.js";
import logger from "../../utils/logger.js";

/**
 * Get aggregated activity statistics for all users with pagination and filtering.
 */
export const getActivityStats = async (req, res) => {
    const { page = 1, limit = 10, search = '', sort = 'last_visit_at', order = 'DESC', startDate = '', endDate = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    try {
        const pool = await connectDB();
        
        let query = `
            SELECT 
                u.id, u.full_name, u.email, u.avatar_url,
                COALESCE(s.total_visits, 0) as total_visits, 
                s.last_visit_at, 
                COALESCE(s.total_active_days, 0) as total_active_days,
                CASE 
                    WHEN s.last_visit_at >= DATE_SUB(NOW(), INTERVAL 2 MINUTE) THEN 'online'
                    ELSE 'offline'
                END as status
            FROM users u
            LEFT JOIN user_activity_summary s ON u.id = s.user_id
            WHERE u.deleted_at IS NULL
        `;
        
        const params = [];
        if (search) {
            query += ` AND (u.full_name LIKE ? OR u.email LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        if (startDate) {
            query += " AND s.last_visit_at >= ?";
            params.push(startDate);
        }

        if (endDate) {
            query += " AND s.last_visit_at <= ?";
            params.push(`${endDate} 23:59:59`);
        }

        // Validate sort columns
        const allowedSort = ['total_visits', 'last_visit_at', 'total_active_days', 'full_name', 'email'];
        const finalSort = allowedSort.includes(sort) ? sort : 'last_visit_at';
        const finalOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        query += ` ORDER BY ${finalSort} ${finalOrder} LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [rows] = await pool.query(query, params);

        // Count for pagination
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM users u 
            LEFT JOIN user_activity_summary s ON u.id = s.user_id 
            WHERE u.deleted_at IS NULL
        `;
        const countParams = [];
        if (search) {
            countQuery += ` AND (u.full_name LIKE ? OR u.email LIKE ?)`;
            countParams.push(`%${search}%`, `%${search}%`);
        }
        if (startDate) {
            countQuery += " AND s.last_visit_at >= ?";
            countParams.push(startDate);
        }
        if (endDate) {
            countQuery += " AND s.last_visit_at <= ?";
            countParams.push(`${endDate} 23:59:59`);
        }

        const [countResult] = await pool.query(countQuery, countParams);
        
        res.json({
            data: rows,
            pagination: {
                total: countResult[0].total,
                page: parseInt(page),
                limit: parseInt(limit)
            }
        });
    } catch (e) {
        logger.error("Get activity stats error:", e);
        res.status(500).json({ error: "Lỗi tải thống kê hoạt động" });
    }
};

/**
 * Get data for activity charts.
 */
export const getActivityCharts = async (req, res) => {
    try {
        const pool = await connectDB();

        // 1. Daily Active Users (last 7 days)
        const [dailyUsers] = await pool.execute(`
            SELECT DATE(visited_at) as date, COUNT(DISTINCT user_id) as count
            FROM user_activity_logs
            WHERE visited_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY DATE(visited_at)
            ORDER BY date ASC
        `);

        // 2. Weekly Visits (total visits in the last 4 weeks)
        const [weeklyVisits] = await pool.execute(`
            SELECT YEARWEEK(visited_at, 1) as week, COUNT(*) as count
            FROM user_activity_logs
            WHERE visited_at >= DATE_SUB(NOW(), INTERVAL 4 WEEK)
            GROUP BY week
            ORDER BY week ASC
        `);

        // 3. Top 5 active users (by total visits)
        const [topUsers] = await pool.execute(`
            SELECT u.full_name, COALESCE(s.total_visits, 0) as total_visits
            FROM user_activity_summary s
            JOIN users u ON s.user_id = u.id
            WHERE u.deleted_at IS NULL
            ORDER BY s.total_visits DESC
            LIMIT 5
        `);

        res.json({
            dailyUsers,
            weeklyVisits,
            topUsers
        });
    } catch (e) {
        logger.error("Get activity charts error:", e);
        res.status(500).json({ error: "Lỗi tải biểu đồ hoạt động" });
    }
};
