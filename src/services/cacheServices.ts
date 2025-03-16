import { redisClient } from "../config/redis";
import { SelfContest } from "./contestServices";

const CACHE_EXPIRATION = 60 * 10; // 10 minutes

export const cacheUpcomingContests = async (
  contests: SelfContest[]
): Promise<void> => {
  try {
    // clearCache();
    // console.log(contests)
    contests.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    await redisClient.set("upcoming_contests", JSON.stringify(contests), {
      EX: CACHE_EXPIRATION,
    });
    console.log("✅ Upcoming contests cached in Redis");
  } catch (error) {
    console.error("❌ Error caching upcoming contests:", error);
  }
};

export const getCachedContests = async (): Promise<SelfContest[] | null> => {
  try {
    const cachedData = await redisClient.get("upcoming_contests");
    return cachedData ? JSON.parse(cachedData) : null;
  } catch (error) {
    console.error("❌ Error fetching cached contests:", error);
    return null;
  }
};

export const clearCache = async (): Promise<void> => {
  try {
    await redisClient.del("upcoming_contests");
    console.log("✅ Upcoming contests cache cleared");
  } catch (error) {
    console.error("❌ Error clearing contest cache:", error);
  }
};
