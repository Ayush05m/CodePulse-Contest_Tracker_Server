import { createClient } from "redis";
import dotenv from "dotenv";
dotenv.config();

const REDIS_HOST = process.env.REDIS_HOST || "redis://localhost:6379";
const REDIS_USER = process.env.REDIS_USER;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
// export const redisClient = createClient({
//   socket: { host: "localhost", port: 6379 },
// });
export const redisClient = createClient({
  username: REDIS_USER,
  password: REDIS_PASSWORD,
  socket: {
    host: REDIS_HOST,
    port: 19480,
  },
});

export const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
    console.log("✅ Redis connected");
  } catch (error) {
    console.error("❌ Redis connection error:", error);
    process.exit(1);
  }
};
