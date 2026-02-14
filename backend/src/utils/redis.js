import { createClient } from "redis";
import logger from "./logger.js";

let redisClient;

export const initRedis = async () => {
    if (!process.env.REDIS_URL) {
        logger.warn("REDIS_URL not found, Redis functionality will be disabled.");
        return null;
    }

    try {
        redisClient = createClient({ url: process.env.REDIS_URL });
        
        redisClient.on("error", (err) => logger.error("Redis Client Error", err));
        redisClient.on("connect", () => logger.info("✅ Redis Connected"));

        await redisClient.connect();
        return redisClient;
    } catch (err) {
        logger.error("Failed to connect to Redis", err);
        return null;
    }
};

export const getRedisClient = () => redisClient;

export const redisCache = async (key, duration, fetchFn) => {
    if (!redisClient || !redisClient.isReady) return fetchFn();

    const cached = await redisClient.get(key);
    if (cached) return JSON.parse(cached);

    const result = await fetchFn();
    if (result) {
        await redisClient.setEx(key, duration, JSON.stringify(result));
    }
    return result;
};
