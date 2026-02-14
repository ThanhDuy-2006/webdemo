import jwt from "jsonwebtoken";
import crypto from "crypto";

export function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "15m" } // 15 minutes - SECURE
  );
}

export function signRefreshToken(user) {
  const token = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET || "refresh_secret_30d_persistent",
    { expiresIn: "30d" } // 30 days - PERSISTENT
  );
  
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  return { token, hash };
}

export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET || "refresh_secret_30d_persistent");
  } catch (error) {
    return null;
  }
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
