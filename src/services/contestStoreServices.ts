import Contest from "../models/Contest"; // Your MongoDB Contest Model
import { redisClient } from "../config/redis"; // Redis client instance
import axios from "axios";

const CONTEST_APIS = [
  { name: "Codeforces", url: "https://codeforces.com/api/contest.list" },
  { name: "CodeChef", url: "https://kontests.net/api/v1/code_chef" },
  { name: "LeetCode", url: "https://leetcode.com/contest/api/list" },
];

export const storeContests = async () => {
  try {
    // Cache upcoming contests in Redis
    // await redisClient.set(
    //   "upcomingContests",
    //   JSON.stringify(upcomingContests),
    //   { EX: 600 }
    // );
    console.log("✅ Upcoming contests cached in Redis");
  } catch (error) {
    console.error("❌ Error storing contests:", error);
  }
};
