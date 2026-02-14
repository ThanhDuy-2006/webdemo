import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { connectDB } from "../../utils/db.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken } from "../../utils/token.js";
import { getFingerprint } from "../../utils/fingerprint.js";

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
};

const setAuthCookies = (res, accessToken, refreshToken) => {
    // Access Token: Standard 15m, available everywhere
    res.cookie('accessToken', accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: 15 * 60 * 1000, // 15 mins
    });

    // Refresh Token: 30 days, RESTRICTED to /api/auth/refresh-token endpoint for security
    res.cookie('refreshToken', refreshToken, {
        ...COOKIE_OPTIONS,
        path: '/api/auth/refresh-token', 
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
};

const clearAuthCookies = (res) => {
    res.clearCookie('accessToken', { ...COOKIE_OPTIONS });
    res.clearCookie('refreshToken', { ...COOKIE_OPTIONS, path: '/api/auth/refresh-token' });
};

// Helper verify function
const verifyCaptcha = async (token) => {
    if (!token && process.env.NODE_ENV === 'production') return false;
    if (!token) return true; // Allow bypass in dev if no token
    try {
        const secretKey = process.env.RECAPTCHA_SECRET_KEY;
        const verifyUrl = "https://www.google.com/recaptcha/api/siteverify";
        const params = new URLSearchParams();
        params.append('secret', secretKey);
        params.append('response', token);

        const response = await fetch(verifyUrl, { 
            method: 'POST',
            body: params
        });
        const data = await response.json();
        return data.success;
    } catch (e) {
        console.error("Captcha error:", e);
        return false;
    }
};

export const register = async (req, res) => {
  try {
      const { full_name, email, password, phone, captchaToken } = req.body || {};

      const isHuman = await verifyCaptcha(captchaToken);
      if (!isHuman) return res.status(400).json({ error: "Captcha verification failed" });

      if (!full_name || !email || !password) return res.status(400).json({ error: "Missing fields" });

      const salt = await bcrypt.genSalt(12);
      const password_hash = await bcrypt.hash(password, salt);
      
      const pool = await connectDB();
      const [result] = await pool.execute(
        `INSERT INTO users (full_name, email, password_hash, phone) VALUES (?, ?, ?, ?)`,
        [full_name, email.toLowerCase(), password_hash, phone || null]
      );

      const userId = result.insertId;
      const user = { id: userId, full_name, email, role: 'member' };
      
      const accessToken = signAccessToken(user);
      const { token: refreshToken, hash: refreshTokenHash } = signRefreshToken(user);

      // Save refresh token
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      await pool.execute(
          `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, device_fingerprint, ip_address) VALUES (?, ?, ?, ?, ?)`,
          [userId, refreshTokenHash, expiresAt, getFingerprint(req), req.ip]
      );

      setAuthCookies(res, accessToken, refreshToken);
      
      res.json({ 
          user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role } 
      });
  } catch (e) {
    console.error("Register Error:", e);
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: "Email exists" });
    res.status(500).json({ error: "Server error" });
  }
};

export const login = async (req, res) => {
  try {
      const { email, password, captchaToken } = req.body || {};
      
      const isHuman = await verifyCaptcha(captchaToken);
      if (!isHuman) return res.status(400).json({ error: "Captcha verification failed" });

      if (!email || !password) return res.status(400).json({ error: "Missing fields" });

      const pool = await connectDB();
      const [rows] = await pool.execute(
        `SELECT * FROM users WHERE email = ? OR phone = ?`,
        [email.toLowerCase(), email]
      );
        
      const user = rows[0];
      if (!user) return res.status(401).json({ error: "Thông tin đăng nhập không chính xác" });

      if (user.status === 'locked') {
        return res.status(403).json({ error: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin." });
      }

      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) return res.status(401).json({ error: "Mật khẩu không đúng" });

      // SESSION LIMIT: ENFORCE MAX 5 SESSIONS
      const [sessions] = await pool.execute(
          `SELECT id FROM refresh_tokens WHERE user_id = ? AND revoked_at IS NULL AND expires_at > NOW()`,
          [user.id]
      );
      if (sessions.length >= 5) {
          // Revoke oldest active session
          await pool.execute(
              `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?`,
              [sessions[0].id]
          );
      }

      const accessToken = signAccessToken(user);
      const { token: refreshToken, hash: refreshTokenHash } = signRefreshToken(user);

      // Save refresh token
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      await pool.execute(
          `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, device_fingerprint, ip_address) VALUES (?, ?, ?, ?, ?)`,
          [user.id, refreshTokenHash, expiresAt, getFingerprint(req), req.ip]
      );

      setAuthCookies(res, accessToken, refreshToken);

      res.json({ 
        user: { 
          id: user.id, 
          full_name: user.full_name, 
          email: user.email, 
          role: user.role, 
          avatar_url: user.avatar_url, 
          phone: user.phone, 
          theme_config: user.theme_config 
        }
      });
  } catch (error) {
      console.error("Login Handler Error:", error);
      res.status(500).json({ error: "Lỗi hệ thống khi đăng nhập" });
  }
};

export const logout = async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
        const hash = hashToken(refreshToken);
        const pool = await connectDB();
        await pool.execute(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ?`, [hash]);
    }
    clearAuthCookies(res);
    res.json({ success: true, message: "Logged out" });
};

export const logoutAll = async (req, res) => {
    const userId = req.user.id;
    const pool = await connectDB();
    await pool.execute(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ?`, [userId]);
    clearAuthCookies(res);
    res.json({ success: true, message: "Đã đăng xuất khỏi tất cả thiết bị" });
};

export const refreshToken = async (req, res) => {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ error: "No refresh token" });

    const payload = verifyRefreshToken(token);
    const hash = hashToken(token);
    const pool = await connectDB();

    // 1. REUSE DETECTION & VALIDATION
    const [rows] = await pool.execute(`SELECT * FROM refresh_tokens WHERE token_hash = ?`, [hash]);
    const tokenRecord = rows[0];

    if (!tokenRecord || tokenRecord.revoked_at || new Date(tokenRecord.expires_at) < new Date() || !payload) {
        // Reuse detection: if token is known but revoked, it's a theft attempt
        if (tokenRecord && payload) {
            console.warn(`[SECURITY] Refresh token reuse detected for user ${payload.id}! Revoking all sessions.`);
            await pool.execute(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ?`, [payload.id]);
        }
        clearAuthCookies(res);
        return res.status(401).json({ error: "SESSION_EXPIRED", message: "Phiên đăng nhập hết hạn hoặc không hợp lệ" });
    }

    // 2. ROTATE: Revoke old & check user status
    await pool.execute(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?`, [tokenRecord.id]);

    const [userRows] = await pool.execute("SELECT * FROM users WHERE id = ?", [payload.id]);
    const user = userRows[0];
    if (!user || user.status === 'locked') {
        clearAuthCookies(res);
        return res.status(401).json({ error: "USER_UNAVAILABLE" });
    }

    // 3. SIGN NEW TOKENS (Rotation)
    const newAccessToken = signAccessToken(user);
    const { token: newRefreshToken, hash: newRefreshTokenHash } = signRefreshToken(user);

    // 4. SAVE NEW RT
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await pool.execute(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, device_fingerprint, ip_address) VALUES (?, ?, ?, ?, ?)`,
        [user.id, newRefreshTokenHash, expiresAt, getFingerprint(req), req.ip]
    );

    setAuthCookies(res, newAccessToken, newRefreshToken);
    res.json({ success: true });
};

export const getMe = async (req, res) => {
    const userId = req.user.id;
    const pool = await connectDB();
    const [rows] = await pool.execute(
        `SELECT id, full_name, email, role, phone, avatar_url, theme_config FROM users WHERE id = ?`,
        [userId]
    );
    
    if (!rows[0]) return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
};

export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Vui lòng nhập email" });

    try {
        const pool = await connectDB();
        const [users] = await pool.execute("SELECT id FROM users WHERE email = ?", [email]);
        if (users.length === 0) {
            return res.json({ success: true, message: "Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu." });
        }

        const token = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        
        await pool.execute("DELETE FROM password_resets WHERE email = ?", [email]);
        await pool.execute(
            "INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)",
            [email, token, expiresAt.toISOString().slice(0, 19).replace('T', ' ')]
        );

        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
        // await sendPasswordResetEmail(email, resetUrl);

        res.json({ 
            success: true, 
            token: token, // Return token for auto-redirect in dev
            message: `Link đặt lại mật khẩu của bạn là (Chỉ hiện khi dev): ${resetUrl}` 
        });
    } catch (e) {
        console.error("ForgotPassword Error:", e);
        res.status(500).json({ error: "Lỗi hệ thống: " + e.message });
    }
};

export const resetPassword = async (req, res) => {
    const { token, new_password } = req.body;
    // ... logic same but add revoking all tokens
    try {
        const pool = await connectDB();
        const [resets] = await pool.execute(
            "SELECT * FROM password_resets WHERE token = ? AND expires_at > NOW()",
            [token]
        );
        if (resets.length === 0) return res.status(400).json({ error: "Link hết hạn" });

        const email = resets[0].email;
        const salt = await bcrypt.genSalt(12);
        const hash = await bcrypt.hash(new_password, salt);

        await pool.execute("UPDATE users SET password_hash = ? WHERE email = ?", [hash, email]);
        
        // Invalidate all sessions
        const [u] = await pool.execute("SELECT id FROM users WHERE email = ?", [email]);
        if (u[0]) {
            await pool.execute("UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ?", [u[0].id]);
        }

        res.json({ success: true, message: "Mật khẩu đã đổi. Vui lòng đăng nhập lại." });
    } catch (e) {
        res.status(500).json({ error: "Lỗi reset" });
    }
};

export const changePassword = async (req, res) => {
    const userId = req.user.id;
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) return res.status(400).json({ error: "Vui lòng nhập đầy đủ" });

    try {
        const pool = await connectDB();
        const [rows] = await pool.execute("SELECT password_hash FROM users WHERE id = ?", [userId]);
        const user = rows[0];

        if (!user || !(await bcrypt.compare(old_password, user.password_hash))) {
            return res.status(400).json({ error: "Mật khẩu cũ không đúng" });
        }

        const salt = await bcrypt.genSalt(12);
        const newHash = await bcrypt.hash(new_password, salt);

        await pool.execute("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, userId]);
        
        // Invalidate all other sessions except maybe current? User requested "Vô hiệu toàn bộ refresh token"
        await pool.execute("UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ?", [userId]);

        clearAuthCookies(res); // Force re-login
        res.json({ success: true, message: "Đổi mật khẩu thành công. Vui lòng đăng nhập lại." });
    } catch (e) {
        res.status(500).json({ error: "Lỗi" });
    }
};
