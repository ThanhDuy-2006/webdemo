import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const schema = `
-- USERS
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'member', -- 'admin', 'member'
    wallet_balance DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- HOUSES (Communities/Markets)
CREATE TABLE IF NOT EXISTS houses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- USER_HOUSES (Membership & Roles in a User House)
CREATE TABLE IF NOT EXISTS user_houses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    house_id INTEGER REFERENCES houses(id),
    role VARCHAR(20) DEFAULT 'member', -- 'owner', 'member'
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, house_id)
);

-- PRODUCTS (Listings)
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    house_id INTEGER REFERENCES houses(id),
    seller_id INTEGER REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(15, 2) NOT NULL,
    image_url TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'active', 'rejected'
    created_at TIMESTAMP DEFAULT NOW()
);

-- STOCK REQUESTS (For sellers to request stock from House Owner/Supplier)
CREATE TABLE IF NOT EXISTS stock_requests (
    id SERIAL PRIMARY KEY,
    house_id INTEGER REFERENCES houses(id),
    requestor_id INTEGER REFERENCES users(id),
    product_name VARCHAR(255),
    quantity INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    created_at TIMESTAMP DEFAULT NOW()
);

-- USER INVENTORIES (What users actually have in hand to sell)
CREATE TABLE IF NOT EXISTS user_inventories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER DEFAULT 0,
    is_selling BOOLEAN DEFAULT TRUE,
    last_updated TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- WALLET TRANSACTIONS
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    type VARCHAR(50) NOT NULL, -- 'deposit', 'purchase', 'sale', 'refund'
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- CARTS
CREATE TABLE IF NOT EXISTS carts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- CART ITEMS
CREATE TABLE IF NOT EXISTS cart_items (
    id SERIAL PRIMARY KEY,
    cart_id INTEGER REFERENCES carts(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER DEFAULT 1,
    added_at TIMESTAMP DEFAULT NOW()
);

-- ORDERS
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    buyer_id INTEGER REFERENCES users(id),
    house_id INTEGER REFERENCES houses(id),
    total_amount DECIMAL(15, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'completed', 
    created_at TIMESTAMP DEFAULT NOW()
);

-- ORDER ITEMS
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    seller_id INTEGER REFERENCES users(id),
    quantity INTEGER NOT NULL,
    price DECIMAL(15, 2) NOT NULL
);

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
`;

async function initDb() {
  console.log("🚀 Initializing Database Schema...");
  console.log("DB URL:", process.env.DATABASE_URL);
  
  try {
    await pool.query(schema);
    console.log("✅ All tables created/verified successfully!");
    
    // Check tables
    const res = await pool.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public'
    `);
    console.log("📊 Existing Tables:", res.rows.map(r => r.table_name).join(", "));
    
  } catch (err) {
    console.error("❌ Schema Init Failed:", err);
  } finally {
    pool.end();
  }
}

initDb();
