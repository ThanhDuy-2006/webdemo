import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import { connectDB } from "./db.js";
import logger from "./logger.js";

let io;
const RATE_LIMIT_WINDOW = 500; // 500ms
const socketRateLimits = new Map();

export const initSocket = async (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:5173",
            credentials: true,
            methods: ["GET", "POST"]
        },
        pingTimeout: 60000, // Increase ping timeout for stability
        pingInterval: 25000,
        transports: ["websocket", "polling"]
    });

    // 1. Redis Adapter Setup (Scaling)
    if (process.env.REDIS_URL) {
        try {
            const pubClient = createClient({ url: process.env.REDIS_URL });
            const subClient = pubClient.duplicate();
            
            await Promise.all([pubClient.connect(), subClient.connect()]);
            io.adapter(createAdapter(pubClient, subClient));
            console.log("✅ Socket.IO Redis Adapter connected");
        } catch (err) {
            console.error("❌ Redis Socket.IO adapter failed, falling back to in-memory:", err.message);
        }
    }

    // 2. Security Middleware (JWT & Authentication)
    io.use((socket, next) => {
        try {
            const cookiesStr = socket.handshake.headers.cookie;
            if (!cookiesStr) return next(new Error("Authentication error: No cookies"));

            const parsedCookies = cookie.parse(cookiesStr);
            const token = parsedCookies.accessToken;

            if (!token) return next(new Error("Authentication error: No token"));

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (!decoded || !decoded.id) return next(new Error("Authentication error: Invalid user"));
            
            socket.user = decoded;
            logger.info(`[Socket] Authorized connection from User: ${decoded.id}`);
            next();
        } catch (err) {
            logger.warn(`[Socket] Unauthorized attempt: ${err.message}`);
            next(new Error("Authentication error: " + err.message));
        }
    });

    // 3. Connection Handling
    io.on("connection", (socket) => {
        const userId = socket.user.id;
        console.log(`[Socket] User connected: ${userId} (SocketID: ${socket.id})`);

        // Join personal room automatically
        socket.join(`user:${userId}`);

        // Rate Limiting Logic
        socket.use(([event, ...args], next) => {
            const lastTime = socketRateLimits.get(socket.id) || 0;
            const now = Date.now();
            if (now - lastTime < RATE_LIMIT_WINDOW) {
                console.warn(`[Socket] Rate limit exceeded for user ${userId} on event: ${event}`);
                return; // Silent drop or could send error back
            }
            socketRateLimits.set(socket.id, now);
            next();
        });

        // Room Management (Secure House Join)
        socket.on("joinHouse", async (houseId) => {
            try {
                if (!houseId) return;
                const pool = await connectDB();
                const [rows] = await pool.execute(
                    "SELECT role FROM user_houses WHERE house_id = ? AND user_id = ? AND role != 'pending'",
                    [houseId, userId]
                );

                if (rows.length > 0 || socket.user.role === 'admin') {
                    socket.join(`house:${houseId}`);
                    console.log(`[Socket] Securely joined house:${houseId} (User: ${userId})`);
                } else {
                    console.warn(`[Socket] Unauthorized house join attempt by ${userId} to house ${houseId}`);
                    socket.emit("error", { message: "Unauthorized to join this house room" });
                }
            } catch (err) {
                console.error("[Socket] House join verification failed:", err);
            }
        });

        socket.on("leaveHouse", (houseId) => {
            socket.leave(`house:${houseId}`);
            console.log(`[Socket] User ${userId} left house:${houseId}`);
        });

        socket.on("disconnect", (reason) => {
            logger.info(`[Socket] User disconnected: ${userId} Reason: ${reason}`);
            socketRateLimits.delete(socket.id); // Cleanup memory
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) throw new Error("Socket.io not initialized!");
    return io;
};

/**
 * Emit to a specific user (production stable)
 */
export const emitToUser = (userId, event, data) => {
    if (io) {
        // Reduced payload size and targeted emission
        io.to(`user:${userId}`).emit(event, data);
    }
};

/**
 * Emit to a specific house (production stable)
 */
export const emitToHouse = (houseId, event, data) => {
    if (io) {
        logger.debug(`[Socket] Emitting ${event} to house:${houseId}`);
        io.to(`house:${houseId}`).emit(event, data);
    }
};
