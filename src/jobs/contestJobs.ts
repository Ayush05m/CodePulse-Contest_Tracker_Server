import cron from "node-cron";
import { fetchAllContests } from "../services/contestServices";
import { cacheUpcomingContests } from "../services/cacheServices";

async function fetchAndUpdateContests(): Promise<void> {
  console.log("🔄 Fetching contest data from multiple sources to cache...");

  const contests = await fetchAllContests();

  console.log("✅ Contests updated");

  // console.log("incoming ready for cache: ", contests);
  const upcomingContests = contests.filter((c) => c.startTime > new Date());
  await cacheUpcomingContests(upcomingContests);
}

// Run every 10 minutes
cron.schedule("*/10 * * * *", fetchAndUpdateContests);

// Run immediately on startup
fetchAndUpdateContests();
import "./solutionJobs"
