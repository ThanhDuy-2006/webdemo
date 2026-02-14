import dotenv from "dotenv";
dotenv.config();
import { connectDB } from "./db.js";

const schema = `
-- USERS
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- HOUSES
CREATE TABLE IF NOT EXISTS houses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id INTEGER REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'active', -- active, closed, suspended, deleted
  created_at TIMESTAMP DEFAULT NOW()
);

-- HOUSE MEMBERS
CREATE TABLE IF NOT EXISTS house_members (
  house_id INTEGER REFERENCES houses(id),
  user_id INTEGER REFERENCES users(id),
  role VARCHAR(20) DEFAULT 'member', -- owner, member
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (house_id, user_id)
);

-- PRODUCTS
-- Sản phẩm thuộc về House (context), do User tạo.
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  house_id INTEGER REFERENCES houses(id),
  owner_id INTEGER REFERENCES users(id), -- Người tạo/Chủ sở hữu
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_quantity INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending', -- pending, active, rejected
  created_at TIMESTAMP DEFAULT NOW()
);

-- STOCK REQUESTS
CREATE TABLE IF NOT EXISTS stock_requests (
  id SERIAL PRIMARY KEY,
  house_id INTEGER REFERENCES houses(id),
  user_id INTEGER REFERENCES users(id),
  product_id INTEGER REFERENCES products(id),
  qty INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  created_at TIMESTAMP DEFAULT NOW()
);

-- USER INVENTORIES (Kho cá nhân)
CREATE TABLE IF NOT EXISTS user_inventories (
  id SERIAL PRIMARY KEY,
  house_id INTEGER REFERENCES houses(id),
  user_id INTEGER REFERENCES users(id),
  product_id INTEGER REFERENCES products(id),
  qty INTEGER NOT NULL DEFAULT 0,
  is_selling BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id, product_id)
);

-- WALLETS
CREATE TABLE IF NOT EXISTS wallets (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  balance DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- WALLET TRANSACTIONS
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id SERIAL PRIMARY KEY,
  wallet_id INTEGER REFERENCES wallets(user_id),
  amount DECIMAL(15, 2) NOT NULL,
  type VARCHAR(50), -- deposit, payment, refund, sales
  ref_order_id INTEGER, -- Link tới order nếu có
  created_at TIMESTAMP DEFAULT NOW()
);

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  house_id INTEGER REFERENCES houses(id),
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- CARTS (Giỏ hàng - Mỗi user 1 giỏ)
CREATE TABLE IF NOT EXISTS carts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id SERIAL PRIMARY KEY,
  cart_id INTEGER REFERENCES carts(id),
  product_id INTEGER REFERENCES products(id),
  qty INTEGER DEFAULT 1,
  UNIQUE(cart_id, product_id)
);

-- ORDERS
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  house_id INTEGER REFERENCES houses(id), -- Order thuộc House nào (Marketplace theo House)
  buyer_id INTEGER REFERENCES users(id),
  total DECIMAL(15, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, paid, shipping, delivered, cancelled
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  seller_id INTEGER REFERENCES users(id),
  product_id INTEGER REFERENCES products(id),
  qty INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL
);
`;

const initDb = async () => {
  try {
    console.log("Initializing database...");
    const conn = await connectDB();
    await conn.query(schema);
    console.log("Database initialized successfully!");
    process.exit(0);
  } catch (e) {
    console.error("Database init failed:", e);
    process.exit(1);
  }
};

initDb();
