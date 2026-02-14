import "../utils/env.js";
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { connectDB } from '../utils/db.js';

// Serialize user to session (not strictly needed for JWT but good for Passport)
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const pool = await connectDB();
        const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
        done(null, rows[0]);
    } catch (err) {
        done(err, null);
    }
});

// Helper to find or create user
const findOrCreateUser = async (profile, provider) => {
    const email = profile.emails?.[0]?.value;
    const providerId = profile.id;
    const name = profile.displayName || profile.username || 'User';
    const avatar = profile.photos?.[0]?.value;

    const pool = await connectDB();

    // 1. Check if user exists by provider ID
    const [rows] = await pool.execute(`SELECT * FROM users WHERE ${provider}_id = ?`, [providerId]);
    if (rows.length > 0) {
        return rows[0];
    }

    // 2. Check if user exists by email (Link account)
    if (email) {
        const [emailRows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (emailRows.length > 0) {
            // Link account
            await pool.execute(`UPDATE users SET ${provider}_id = ?, avatar_url = COALESCE(avatar_url, ?) WHERE email = ?`, [providerId, avatar, email]);
            return { ...emailRows[0], [provider + '_id']: providerId };
        }
    }

    // 3. Create new user
    // Generate random password placeholder
    const dummyPassword = Math.random().toString(36).slice(-8); 
    // Use bcrypt if we were doing password auth, but here we just insert
    // Ideally we should hash it but for oauth only users it matters less as they can't login with password anyway
    // For now, let's just insert
    
    const [result] = await pool.execute(
        `INSERT INTO users (full_name, email, password_hash, ${provider}_id, avatar_url, role, status, wallet_balance) VALUES (?, ?, ?, ?, ?, 'member', 'active', 0)`,
        [name, email, 'oauth_user', providerId, avatar]
    );

    return { id: result.insertId, email, full_name: name, role: 'member' };
};

// Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.FRONTEND_URL.replace('5173', '3000')}/api/auth/google/callback`
  },
  async function(accessToken, refreshToken, profile, done) {
    try {
        const user = await findOrCreateUser(profile, 'google');
        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
  }
));

// GitHub Strategy
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID || 'place_holder_id',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || 'place_holder_secret',
    callbackURL: `${process.env.FRONTEND_URL.replace('5173', '3000')}/api/auth/github/callback`
  },
  async function(accessToken, refreshToken, profile, done) {
    try {
        const user = await findOrCreateUser(profile, 'github');
        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
  }
));

export default passport;
