import Contest from "../models/Contest";
import Solution from "../models/Solution";
import { formatCodeforcesVideoTitle, Video } from "./getYoutubePlaylistVideos";

export async function addContestSolution(video: Video) {
  const title = video.title;
  let trimmedTitle = video.title.split("|")[0].trim().toLowerCase();

  if (trimmedTitle.includes("codeforces"))
    trimmedTitle = getContestUrl(trimmedTitle);
  if (trimmedTitle.includes("leetcode"))
    trimmedTitle = trimmedTitle.split(" ").slice(1).join("-");
  if (trimmedTitle.includes("codechef"))
    trimmedTitle = "START" + trimmedTitle.split(" ")[2];

  if (!trimmedTitle) {
    return;
  }

  console.log(trimmedTitle);

  // Search for a contest where 'name' **includes** the trimmed title
  const contest = await Contest.findOne({
    contestId: { $regex: trimmedTitle, $options: "i" }, // Case-insensitive partial match
  });

  if (!contest) {
    console.error(`No contest found for: ${trimmedTitle}`);
    return;
  }

  try {
    if (!contest.solutionLink?.includes(video.url)) {
      contest.solutionLink?.push(video.url);
      await contest.save();
    }
  } catch (err) {
    console.error("unable to update contest solution", err);
  }

  try {
    const solution = await Solution.findOne({ contest_id: contest._id });
    if (!solution) {
      const solutionBody = {
        contest_id: contest._id,
        youtubeLinks: {
          url: video.url,
          title: video.title,
          thumbnail: video.thumbnail,
          description: video.description,
        },
      };
      // console.log(solutionBody)
      const contestSolution = await Solution.create(solutionBody);
      console.log(`Added solution for contest: ${trimmedTitle}`);
    }
    return "Solution Exists";
  } catch (err) {
    // console.log(contest);
    console.error("unable to create contest solution", err);
  }
}

function normalizeContestName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, " ") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-|-$/g, ""); // Trim leading/trailing hyphens
}

function getContestUrl(name: string): string {
  const normalized = normalizeContestName(name);
  const parts = normalized.split("-");

  // Handle Educational Rounds
  if (parts.includes("educational")) {
    const roundIndex = parts.indexOf("round");
    if (roundIndex !== -1 && parts[roundIndex + 1]?.match(/^\d+$/)) {
      return `educational-codeforces-round-${parts[roundIndex + 1]}`;
    }
  }

  // Handle Regular Rounds
  if (parts.includes("codeforces") && parts.includes("round")) {
    const roundIndex = parts.indexOf("round");
    const roundNumber = parts[roundIndex + 1];

    if (roundNumber?.match(/^\d+$/)) {
      const divSuffix = parts
        .slice(roundIndex + 2)
        .join("-")
        .includes("div-2")
        ? "-div-2"
        : "";
      return `codeforces-round-${roundNumber}${divSuffix}`;
    }
  }
  return `codeforces-${normalized}`;
}
