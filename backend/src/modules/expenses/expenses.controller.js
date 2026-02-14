import { connectDB } from "../../utils/db.js";

// --- HELPERS ---
const getMonthRange = (monthStr) => {
    // monthStr: 'YYYY-MM'
    const [y, m] = monthStr.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const start = `${monthStr}-01 00:00:00`;
    const end = `${monthStr}-${daysInMonth} 23:59:59`;
    return { start, end };
};

export const syncTransactions = async (userId) => {
    const pool = await connectDB();
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Get latest sync time for HOUSE_TX
        const [lastSync] = await connection.query(
            `SELECT MAX(source_id) as last_id FROM financial_records 
             WHERE user_id = ? AND source_type = 'HOUSE_TX'`, 
            [userId]
        );
        const lastId = lastSync[0].last_id || 0;

        // 2. Fetch new transactions (Where I am buyer OR seller)
        const [newTxs] = await connection.query(`
            SELECT t.*, p.seller_id, p.name as prod_name, t.description as tx_desc
            FROM transactions t
            LEFT JOIN products p ON p.id = t.product_id
            WHERE (t.user_id = ? OR p.seller_id = ?) 
              AND t.id > ?
            ORDER BY t.id ASC
        `, [userId, userId, lastId]);

        if (newTxs.length === 0) {
            await connection.commit();
            return { synced: 0 };
        }

        // 3. Map categories by Name AND Type to avoid collision (e.g. 'Khác' for Expense vs Income)
        const [cats] = await connection.query(`SELECT id, name, type FROM expense_categories WHERE is_default = TRUE`);
        const catMap = {};
        cats.forEach(c => {
            catMap[`${c.name}_${c.type}`] = c.id;
        });

        const records = [];
        for (const tx of newTxs) {
            const amount = Math.abs(parseFloat(tx.total_price || 0));
            if (amount === 0) continue;

            let type = 'EXPENSE';
            let catId = null;
            let note = tx.tx_desc || `Giao dịch: ${tx.prod_name}`;

            // Case A: I am the Payer/Buyer (the one whose user_id is on the transaction)
            if (tx.user_id === userId) {
                if (tx.type === 'REFUND') {
                    type = 'INCOME';
                    catId = catMap['Khác_INCOME'];
                    note = tx.tx_desc || `Hoàn tiền: ${tx.prod_name}`;
                } else {
                    type = 'EXPENSE';
                    catId = catMap['Mua sắm_EXPENSE'] || catMap['Khác_EXPENSE'];
                }
            } 
            // Case B: I am the Seller (the one who receives payment or pays refund)
            else if (tx.seller_id === userId) {
                if (tx.type === 'REFUND') {
                    // Seller paying back to buyer -> Expense
                    type = 'EXPENSE';
                    catId = catMap['Khác_EXPENSE'];
                    note = tx.tx_desc || `Hoàn trả khách: ${tx.prod_name}`;
                } else {
                    // Seller receiving money -> Income
                    type = 'INCOME';
                    catId = catMap['Khác_INCOME']; 
                    note = tx.tx_desc || `Bán hàng: ${tx.prod_name}`;
                }
            }

            if (!catId) catId = type === 'INCOME' ? catMap['Khác_INCOME'] : catMap['Khác_EXPENSE'];

            records.push([
                userId, amount, type, catId, 
                tx.created_at, note, null, tx.house_id, 
                'HOUSE_TX', tx.id
            ]);
        }

        if (records.length > 0) {
            await connection.query(`
                INSERT IGNORE INTO financial_records 
                (user_id, amount, type, category_id, transaction_date, note, image_url, house_id, source_type, source_id)
                VALUES ?
            `, [records]);
        }

        await connection.commit();
        return { synced: records.length };
    } catch (e) {
        if (connection) await connection.rollback();
        console.error("Sync failed:", e);
        throw e;
    } finally {
        connection.release();
    }
};


// --- CONTROLLERS ---

// --- CONTROLLERS ---

export const getExpenses = async (req, res) => {
    const userId = req.user.id;
    const { month, day, category_id, type } = req.query; // Filters

    try {
        try {
            await syncTransactions(userId); // Auto-sync on load
        } catch (syncError) {
            console.warn("Auto-sync failed (likely missing wallet module), proceeding with manual records only.", syncError.message);
        }

        let query = `
            SELECT r.*, c.name as category_name, c.icon as category_icon, c.color as category_color
            FROM financial_records r
            LEFT JOIN expense_categories c ON r.category_id = c.id
            WHERE r.user_id = ? AND r.deleted_at IS NULL
        `;
        const params = [userId];

        if (day) {
            query += ` AND DATE(r.transaction_date) = ?`;
            params.push(day);
        } else if (month) {
            const { start, end } = getMonthRange(month);
            query += ` AND r.transaction_date BETWEEN ? AND ?`;
            params.push(start, end);
        }
        if (category_id) {
            query += ` AND r.category_id = ?`;
            params.push(category_id);
        }
        if (type) {
             query += ` AND r.type = ?`;
             params.push(type);
        }

        query += ` ORDER BY r.transaction_date DESC`;

        const pool = await connectDB();
        const [rows] = await pool.execute(query, params);
        res.json(rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to fetch expenses" });
    }
};

export const createExpense = async (req, res) => {
    const userId = req.user.id;
    const { amount, type, category_id, transaction_date, note, image_url } = req.body;

    if (!amount || !type || !transaction_date) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const pool = await connectDB();
        const [result] = await pool.execute(`
            INSERT INTO financial_records 
            (user_id, amount, type, category_id, transaction_date, note, image_url, source_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'MANUAL')
        `, [
            userId, 
            amount, 
            type, 
            category_id || null, 
            transaction_date, 
            note || '', 
            image_url || null 
        ]);

        res.json({ success: true, id: result.insertId });
    } catch (e) {
        console.error("Create expense failed:", e);
        res.status(500).json({ error: "Failed to create record" });
    }
};

export const getExpenseDetail = async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    try {
        const pool = await connectDB();
        
        // Fetch Basic Record with Category
        const [rows] = await pool.execute(`
             SELECT r.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
                    CASE 
                        WHEN r.source_type = 'WALLET' THEN wt.description 
                        WHEN r.source_type = 'ORDER' THEN o.id 
                    END as source_desc
             FROM financial_records r
             LEFT JOIN expense_categories c ON r.category_id = c.id
             LEFT JOIN wallet_transactions wt ON r.source_type = 'WALLET' AND r.source_id = wt.id
             LEFT JOIN orders o ON r.source_type = 'ORDER' AND r.source_id = o.id
             WHERE r.id = ? AND r.user_id = ?
        `, [id, userId]);

        if (rows.length === 0) return res.status(404).json({ error: "Not found" });
        const record = rows[0];

        // Fetch Logs
        const [logs] = await pool.execute(`
            SELECT action, old_value, new_value, created_at 
            FROM expense_logs 
            WHERE record_id = ? ORDER BY created_at DESC
        `, [id]);

        res.json({ ...record, logs });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to fetch detail" });
    }
};

export const getCategories = async (req, res) => {
    try {
        const pool = await connectDB();
        const [rows] = await pool.execute(`
            SELECT * FROM expense_categories 
            WHERE user_id = ? OR is_default = TRUE
            ORDER BY is_default DESC, name ASC
        `, [req.user.id]);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch categories" });
    }
};

export const getStats = async (req, res) => {
    const userId = req.user.id;
    const { month } = req.query; // 'YYYY-MM'
    if (!month) return res.status(400).json({ error: "Month required" });

    try {
        const { start, end } = getMonthRange(month);
        const pool = await connectDB();

        // 1. Total Income vs Expense
        const [totals] = await pool.execute(`
            SELECT type, SUM(amount) as total 
            FROM financial_records 
            WHERE user_id = ? AND transaction_date BETWEEN ? AND ? AND deleted_at IS NULL
            GROUP BY type
        `, [userId, start, end]);

        let income = 0;
        let expense = 0;
        totals.forEach(t => {
            if (t.type === 'INCOME') income = Number(t.total);
            else expense = Number(t.total);
        });

        // 2. By Category (Expense Only)
        // LEFT JOIN to include records that might have deleted categories (though we set NULL)
        const [cats] = await pool.execute(`
            SELECT c.name, c.color, SUM(r.amount) as value
            FROM financial_records r
            LEFT JOIN expense_categories c ON r.category_id = c.id
            WHERE r.user_id = ? AND r.type = 'EXPENSE' AND r.transaction_date BETWEEN ? AND ? AND r.deleted_at IS NULL
            GROUP BY c.id, c.name, c.color
            HAVING value > 0
            ORDER BY value DESC
        `, [userId, start, end]);

        // Fix null names if category was deleted
        const formattedCats = cats.map(c => ({
            name: c.name || 'Chưa phân loại',
            color: c.color || '#94a3b8',
            value: Number(c.value)
        }));

         // 3. Comparison with previous month
        const prevDate = new Date(start);
        prevDate.setMonth(prevDate.getMonth() - 1);
        const prevMonthStr = prevDate.toISOString().slice(0, 7); // YYYY-MM
        const { start: pStart, end: pEnd } = getMonthRange(prevMonthStr);

        const [prevTotals] = await pool.execute(`
             SELECT SUM(amount) as total 
             FROM financial_records 
             WHERE user_id = ? AND type = 'EXPENSE' AND transaction_date BETWEEN ? AND ? AND deleted_at IS NULL
        `, [userId, pStart, pEnd]);
        
        const prevExpense = Number(prevTotals[0].total) || 0;
        const diff = expense - prevExpense;
        const percent = prevExpense === 0 ? 100 : ((diff / prevExpense) * 100).toFixed(1);

        res.json({
            month,
            income,
            expense,
            categories: formattedCats,
            comparison: {
                prev_month: prevMonthStr,
                prev_expense: prevExpense,
                diff,
                percent: Number(percent)
            }
        });

    } catch (e) {
         console.error(e);
         res.status(500).json({ error: "Stats failed" });
    }
};

export const deleteExpense = async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    
    try {
        const pool = await connectDB();
        // Check if exists
        const [check] = await pool.execute("SELECT id FROM financial_records WHERE id = ? AND user_id = ?", [id, userId]);
        if (check.length === 0) return res.status(404).json({ error: "Record not found" });

        // Soft Delete
        await pool.execute("UPDATE financial_records SET deleted_at = NOW() WHERE id = ?", [id]);
        
        // Log
        await pool.execute(
            "INSERT INTO expense_logs (record_id, user_id, action) VALUES (?, ?, 'SOFT_DELETE')", 
            [id, userId]
        );

        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Delete failed" });
    }
};

export const restoreExpense = async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    
    try {
        const pool = await connectDB();
        await pool.execute("UPDATE financial_records SET deleted_at = NULL WHERE id = ? AND user_id = ?", [id, userId]);
        
         // Log
         await pool.execute(
            "INSERT INTO expense_logs (record_id, user_id, action) VALUES (?, ?, 'RESTORE')", 
            [id, userId]
        );

        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Restore failed" });
    }
};

export const updateCategory = async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { category_id, note } = req.body;

    try {
         const pool = await connectDB();
         
         // 1. Get current record
         const [rows] = await pool.execute("SELECT * FROM financial_records WHERE id = ? AND user_id = ?", [id, userId]);
         if (rows.length === 0) return res.status(404).json({ error: "Record not found" });
         
         const currentRecord = rows[0];
         const oldCatId = currentRecord.category_id;
         const oldNote = currentRecord.note;

         // 2. Prepare new values (use existing if undefined)
         const newCatId = category_id !== undefined ? category_id : oldCatId;
         const newNote = note !== undefined ? note : oldNote;

         // 3. Update
         await pool.execute(`
            UPDATE financial_records 
            SET category_id = ?, note = ? 
            WHERE id = ? AND user_id = ?
         `, [newCatId, newNote, id, userId]);

         // 4. Log if category changed
         if (category_id !== undefined && oldCatId != category_id) {
             await pool.execute(
                "INSERT INTO expense_logs (record_id, user_id, action, old_value, new_value) VALUES (?, ?, 'UPDATE_CATEGORY', ?, ?)", 
                [id, userId, String(oldCatId), String(category_id)]
            );
         }

         res.json({ success: true });
    } catch (e) {
        console.error("Update failed:", e);
        res.status(500).json({ error: "Update failed" });
    }
};

// --- MIGRATION ---
export const runMigration = async (req, res) => {
    // Only allow admin to run migration manually via API if needed
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });

    try {
        const pool = await connectDB();
        const connection = await pool.getConnection();
        console.log("🔌 Starting migration via API...");

        // 1. Categories
        await connection.query(`
            CREATE TABLE IF NOT EXISTS expense_categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NULL,
                name VARCHAR(100) NOT NULL,
                type ENUM('EXPENSE', 'INCOME') NOT NULL,
                icon VARCHAR(50), 
                color VARCHAR(20),
                is_default BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 2. Records
        await connection.query(`
            CREATE TABLE IF NOT EXISTS financial_records (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                amount DECIMAL(15, 2) NOT NULL,
                type ENUM('EXPENSE', 'INCOME') NOT NULL,
                category_id INT,
                transaction_date DATETIME NOT NULL,
                note TEXT,
                image_url VARCHAR(255),
                house_id INT NULL,
                source_type ENUM('MANUAL', 'WALLET', 'ORDER') DEFAULT 'MANUAL',
                source_id INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE SET NULL,
                INDEX (user_id, transaction_date),
                UNIQUE KEY unique_source (source_type, source_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 3. Budgets
        await connection.query(`
            CREATE TABLE IF NOT EXISTS budgets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                category_id INT NULL,
                amount DECIMAL(15, 2) NOT NULL,
                month VARCHAR(7) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE CASCADE,
                UNIQUE KEY unique_budget (user_id, category_id, month)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 4. Seed
        const [rows] = await connection.query("SELECT COUNT(*) as count FROM expense_categories WHERE is_default = TRUE");
        if (rows[0].count === 0) {
            const defaults = [
                { name: 'Ăn uống', type: 'EXPENSE', icon: '🍜', color: '#FF6B6B' },
                { name: 'Mua sắm', type: 'EXPENSE', icon: '🛍️', color: '#4ECDC4' },
                { name: 'Sinh hoạt', type: 'EXPENSE', icon: '🏠', color: '#45B7D1' },
                { name: 'Di chuyển', type: 'EXPENSE', icon: '🚗', color: '#96CEB4' },
                { name: 'Giải trí', type: 'EXPENSE', icon: '🎮', color: '#FFEEAD' },
                { name: 'Sức khỏe', type: 'EXPENSE', icon: '🏥', color: '#D4A5A5' },
                { name: 'Khác', type: 'EXPENSE', icon: '📦', color: '#9E9E9E' },
                { name: 'Lương', type: 'INCOME', icon: '💰', color: '#2ECC71' },
                { name: 'Đầu tư', type: 'INCOME', icon: '📈', color: '#27AE60' },
                { name: 'Thưởng', type: 'INCOME', icon: '🎁', color: '#F1C40F' },
                { name: 'Khác', type: 'INCOME', icon: '📦', color: '#BDC3C7' }
            ];
            const values = defaults.map(d => `(NULL, '${d.name}', '${d.type}', '${d.icon}', '${d.color}', TRUE)`);
            await connection.query(`INSERT INTO expense_categories (user_id, name, type, icon, color, is_default) VALUES ${values.join(',')}`);
        }

        connection.release();
        res.json({ success: true, message: "Migration completed successfully" });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Migration failed: " + e.message });
    }
};
