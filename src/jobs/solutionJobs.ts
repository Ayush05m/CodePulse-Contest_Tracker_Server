import cron from "node-cron";
import { fetchAllContests } from "../services/contestServices";
import { cacheUpcomingContests } from "../services/cacheServices";
import { getPlaylistVideos } from "../services/getYoutubePlaylistVideos";
import { addContestSolution } from "../services/addContestSolutiton";

const playlistIdLink = [
  "PLcXpkI9A-RZI6FhydNz3JBt_-p_i25Cbr",
  "PLcXpkI9A-RZIZ6lsE0KCcLWeKNoG45fYr",
  "PLcXpkI9A-RZLUfBSNp-YQBCOezZKbDSgB",
];

async function fetchAndUpdateSolutions(): Promise<void> {
  playlistIdLink.map(async (e) => {
    getPlaylistVideos(e)
      .then((videos) => {
        videos.forEach((video) => addContestSolution(video));
      })
      .catch((err) => console.error(err));
  });
  console.log('✅ Solution updated');

}

// Run every 10 minutes
cron.schedule("*/10 * * * *", fetchAndUpdateSolutions);

// Run immediately on startup
fetchAndUpdateSolutions();
