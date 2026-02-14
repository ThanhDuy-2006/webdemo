import jwt from "jsonwebtoken";
import { connectDB } from "../utils/db.js";

export const verifyAccessToken = (req, res, next) => {
  const token = req.cookies.accessToken;

  if (!token) {
    return res.status(401).json({ error: "Access token missing" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
        return res.status(401).json({ error: "TOKEN_EXPIRED", message: "Access token expired" });
    }
    return res.status(401).json({ error: "Invalid access token" });
  }
};

export const requireAdmin = (req, res, next) => {
  verifyAccessToken(req, res, () => {
    if (req.user && req.user.role === "admin") {
      next();
    } else {
      res.status(403).json({ error: "Admin access required" });
    }
  });
};

export const requireOwner = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const houseId = req.params.id || req.body.houseId || req.body.house_id;

        if (!houseId) return res.status(400).json({ error: "Missing houseId" });
        
        const pool = await connectDB();
        const [rows] = await pool.execute(
            "SELECT role FROM user_houses WHERE user_id = ? AND house_id = ?", 
            [userId, houseId]
        );

        if (rows.length === 0 || rows[0].role !== 'owner') {
             // Admin override check
             if (req.user.role === 'admin') return next();
             
             return res.status(403).json({ error: "Owner rights required" });
        }

        next();
    } catch (e) {
        console.error("requireOwner error:", e);
        res.status(500).json({ error: "Authorization check failed" });
    }
}

export const extractUser = async (req, res, next) => {
    const token = req.cookies.accessToken;
    
    if (!token) {
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) {
        next();
    }
};
