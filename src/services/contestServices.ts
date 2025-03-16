import axios from "axios";
import Contest from "../models/Contest";
import { cacheUpcomingContests } from "./cacheServices";

type ContestStatus = "past" | "upcoming" | " ongoing";

export interface SelfContest {
  contestId: string;
  name: string;
  platform: string;
  startTime: Date;
  endTime: Date;
  duration?: number;
  url?: string;
  status: ContestStatus;
  solutionLink?: string[];
}

interface leetcodeContest {
  title: string;
  titleSlug: string;
  duration: number;
  startTime: number;
}
interface codechefContest {
  contest_code: string;
  contest_name: string;
  contest_start_date: string;
  contest_end_date: string;
  contest_start_date_iso: string;
  contest_end_date_iso: string;
  contest_duration: string;
  distinct_users: number;
}

/** Fetch Codeforces Contests */
export async function fetchCodeforcesContests(): Promise<SelfContest[]> {
  try {
    const response = await axios.get("https://codeforces.com/api/contest.list");

    // Filter out IOI and non-standard contests
    const filteredContests = response.data.result.filter((contest: any) => {
      // Exclude contests with IOI type
      if (contest.type === "IOI") return false;

      // Exclude contests with "Olympiad" in the name
      if (contest.name.includes("Olympiad")) return false;

      // Include only standard Codeforces rounds and Educational rounds
      return (
        contest.name.includes("Codeforces Round") ||
        contest.name.includes("Educational Codeforces Round")
      );
    });

    // Process upcoming contests
    const upcomingContests: SelfContest[] = filteredContests
      .filter((contest: any) => contest.phase === "BEFORE")
      .map((contest: any) => {
        const startTime = new Date(contest.startTimeSeconds * 1000);
        const endTime = new Date(
          contest.startTimeSeconds * 1000 + contest.durationSeconds * 1000
        );

        // Format contestId to match video titles
        let videoFriendlyId = "";

        if (contest.name.includes("Educational")) {
          // Format: "Educational Codeforces Round 173"
          const roundNumber = contest.name.match(
            /Educational Codeforces Round (\d+)/i
          );
          if (roundNumber && roundNumber[1]) {
            videoFriendlyId = `educational-codeforces-round-${roundNumber[1]}`;
          }
        } else {
          // Format: "Codeforces Round 998 (Div 3)"
          const roundMatch = contest.name.match(/Codeforces Round (\d+)/i);
          const divMatch = contest.name.match(
            /\(Div\.? (\d+)(?:\s*\+\s*Div\.? (\d+))?\)/i
          );

          if (roundMatch && roundMatch[1]) {
            videoFriendlyId = `codeforces-round-${roundMatch[1]}`;

            if (divMatch) {
              // Single division
              if (divMatch[1] && !divMatch[2]) {
                videoFriendlyId += `-div-${divMatch[1]}`;
              }
              // Div 1 + Div 2
              else if (divMatch[1] && divMatch[2]) {
                videoFriendlyId += `-div-1-plus-2`;
              }
            }
          }
        }

        // If we couldn't parse a friendly ID, fall back to a simplified version of the name
        if (!videoFriendlyId) {
          videoFriendlyId = contest.name
            .toLowerCase()
            .replace(/[^\w\s]/gi, "")
            .replace(/\s+/g, "-");
        }

        return {
          contestId: videoFriendlyId,
          name: contest.name,
          type: contest.type,
          originalId: contest.id.toString(), // Keep original ID for reference
          platform: "Codeforces",
          startTime: startTime,
          endTime: endTime,
          duration: contest.durationSeconds,
          url: `https://codeforces.com/contest/${contest.id}`,
          status: "upcoming" as ContestStatus,
        };
      });

    // Process ongoing contests
    const ongoingContests = filteredContests.filter(
      (contest: any) => contest.phase === "CODING"
    );

    // Update status of contests that are no longer ongoing
    if (!ongoingContests.length) {
      await Contest.updateMany(
        { platform: "Codeforces", status: "ongoing" },
        { $set: { status: "past" } }
      );
    }

    // Process each ongoing contest
    for (const contest of ongoingContests) {
      const startTime = new Date(contest.startTimeSeconds * 1000);
      const endTime = new Date(
        contest.startTimeSeconds * 1000 + contest.durationSeconds * 1000
      );

      // Format contestId using the same logic as above
      let videoFriendlyId = "";

      if (contest.name.includes("Educational")) {
        const roundNumber = contest.name.match(
          /Educational Codeforces Round (\d+)/i
        );
        if (roundNumber && roundNumber[1]) {
          videoFriendlyId = `educational-codeforces-round-${roundNumber[1]}`;
        }
      } else {
        const roundMatch = contest.name.match(/Codeforces Round (\d+)/i);
        const divMatch = contest.name.match(
          /\(Div\.? (\d+)(?:\s*\+\s*Div\.? (\d+))?\)/i
        );

        if (roundMatch && roundMatch[1]) {
          videoFriendlyId = `codeforces-round-${roundMatch[1]}`;

          if (divMatch) {
            if (divMatch[1] && !divMatch[2]) {
              videoFriendlyId += `-div-${divMatch[1]}`;
            } else if (divMatch[1] && divMatch[2]) {
              videoFriendlyId += `-div-1-plus-2`;
            }
          }
        }
      }

      if (!videoFriendlyId) {
        videoFriendlyId = contest.name
          .toLowerCase()
          .replace(/[^\w\s]/gi, "")
          .replace(/\s+/g, "-");
      }

      const contestData = {
        contestId: videoFriendlyId,
        name: contest.name,
        originalId: contest.id.toString(),
        platform: "Codeforces",
        startTime: startTime,
        endTime: endTime,
        duration: contest.durationSeconds,
        url: `https://codeforces.com/contest/${contest.id}`,
        status: "ongoing" as ContestStatus,
      };

      try {
        const existsInDb = await Contest.findOne({
          originalId: contest.id.toString(),
          platform: "Codeforces",
        });
        if (!existsInDb) {
          try {
            await Contest.create(contestData);
          } catch (err) {
            console.error("Error creating Codeforces contest:", err);
          }
        }
      } catch (err) {
        console.error("Error checking Codeforces contest in DB:", err);
      }
    }

    return upcomingContests;
  } catch (error) {
    console.log("error in codeforces fetching contest:", error);
  }
  return [] as SelfContest[];
}

/** Fetch Codeforces Past Contests */
export async function fetchCodeforcesPastContests() {
  try {
    const response = await axios.get("https://codeforces.com/api/contest.list");

    const filteredContests = response.data.result.filter((contest: any) => {
      if (contest.type === "IOI") return false;
      if (contest.name.includes("Olympiad")) return false;
      return (
        contest.name.includes("Codeforces Round") ||
        contest.name.includes("Educational Codeforces Round")
      );
    });

    const contestsToProcess = filteredContests.filter(
      (contest: any) => contest.phase === "FINISHED"
    );

    let processedCount = 0;

    for (const contest of contestsToProcess) {
      const startTime = new Date(contest.startTimeSeconds * 1000);
      const endTime = new Date(
        contest.startTimeSeconds * 1000 + contest.durationSeconds * 1000
      );

      // Format contestId using the same logic as in fetchCodeforcesContests
      let videoFriendlyId = "";

      if (contest.name.includes("Educational")) {
        const roundNumber = contest.name.match(
          /Educational Codeforces Round (\d+)/i
        );
        if (roundNumber && roundNumber[1]) {
          videoFriendlyId = `educational-codeforces-round-${roundNumber[1]}`;
        }
      } else {
        const roundMatch = contest.name.match(/Codeforces Round (\d+)/i);
        const divMatch = contest.name.match(
          /\(Div\.? (\d+)(?:\s*\+\s*Div\.? (\d+))?\)/i
        );

        if (roundMatch && roundMatch[1]) {
          videoFriendlyId = `codeforces-round-${roundMatch[1]}`;

          if (divMatch) {
            if (divMatch[1] && !divMatch[2]) {
              videoFriendlyId += `-div-${divMatch[1]}`;
            } else if (divMatch[1] && divMatch[2]) {
              videoFriendlyId += `-div-1-plus-2`;
            }
          }
        }
      }

      if (!videoFriendlyId) {
        videoFriendlyId = contest.name
          .toLowerCase()
          .replace(/[^\w\s]/gi, "")
          .replace(/\s+/g, "-");
      }

      const contestData = {
        contestId: videoFriendlyId,
        name: contest.name,
        originalId: contest.id.toString(),
        platform: "Codeforces",
        startTime: startTime,
        endTime: endTime,
        duration: contest.durationSeconds,
        url: `https://codeforces.com/contest/${contest.id}`,
        status: "past" as ContestStatus,
      };

      try {
        const existsInDb = await Contest.findOne({
          originalId: contest.id.toString(),
          platform: "Codeforces",
        });
        if (existsInDb) {
          processedCount++;
          if (processedCount >= 3) {
            return [];
          }
        } else {
          try {
            await Contest.create(contestData);
          } catch (err) {
            console.error("Error creating Codeforces contest:", err);
          }
        }
      } catch (err) {
        console.error("Error checking Codeforces contest in DB:", err);
      }
    }
    console.log("codeforces past contest updated in db");
  } catch (error) {
    console.error("❌ Error fetching Codeforces past contests:", error);
    return [];
  }
}

/** Fetch CodeChef Contests */
export async function fetchCodeChefContests(): Promise<SelfContest[]> {
  try {
    let response = await axios.get(
      "https://www.codechef.com/api/list/contests/all"
    );
    let upcoming: codechefContest[] = response.data.future_contests;
    const upcomingContests: SelfContest[] = upcoming
      .filter(
        (contest: codechefContest) =>
          new Date(contest.contest_end_date_iso) > new Date()
      )
      .map((contest: codechefContest) => {
        const startTime = new Date(contest.contest_start_date_iso);
        const endTime = new Date(contest.contest_end_date_iso);
        const duration = (endTime.getTime() - startTime.getTime()) / 1000;

        const contestData: SelfContest = {
          contestId: contest.contest_code.slice(5),
          name: contest.contest_name,
          platform: "CodeChef",
          startTime: startTime,
          endTime: endTime,
          duration: duration,
          url: `https://www.codechef.com/${contest.contest_code}`,
          status: "upcoming" as ContestStatus,
        };
        return contestData;
      });
    console.log(upcomingContests);

    response = await axios.get(
      "https://www.codechef.com/api/list/contests/present"
    );
    let present: codechefContest[] = response.data.present_contests;
    if (!present) {
      await Contest.updateMany(
        { status: "ongoing" },
        { $set: { status: "past" } }
      );
    } else {
      for (const contest of present) {
        const startTime = new Date(contest.contest_start_date_iso);
        const endTime = new Date(contest.contest_end_date_iso);
        const duration = (endTime.getTime() - startTime.getTime()) / 1000;

        const contestData = {
          contestId: contest.contest_code.slice(5),
          name: contest.contest_name,
          platform: "CodeChef",
          startTime: startTime,
          endTime: endTime,
          duration: duration,
          url: `https://www.codechef.com/${contest.contest_code}`,
          status: "ongoing" as ContestStatus,
        };

        try {
          const existsInDb = await Contest.findOne({
            contestId: contest.contest_code,
          });
          if (!existsInDb) {
            try {
              await Contest.create(contestData);
            } catch (err) {
              console.error("Error creating CodeChef contest:", err);
            }
          }
        } catch (err) {
          console.error("Error checking CodeChef contest in DB:", err);
        }
      }
    }
    return upcomingContests;
  } catch (err) {
    console.log("error in codechef fetching contest:", err);
  }
  return [] as SelfContest[];
}

/** Fetch CodeChef Past Contests */
export async function fetchCodeChefPastContests() {
  try {
    const response = await axios.get(
      "https://www.codechef.com/api/list/contests/all"
    );
    const contestsToProcess = response.data.past_contests || [];

    for (const contest of contestsToProcess) {
      const startTime = new Date(contest.contest_start_date_iso);
      const endTime = new Date(contest.contest_end_date_iso);
      const duration = (endTime.getTime() - startTime.getTime()) / 1000;

      const contestData = {
        contestId: contest.contest_code,
        name: contest.contest_name,
        platform: "CodeChef",
        startTime: startTime,
        endTime: endTime,
        duration: duration,
        url: `https://www.codechef.com/${contest.contest_code}`,
        status: "past" as ContestStatus,
      };

      try {
        const existsInDb = await Contest.findOne({
          contestId: contest.contest_code,
        });
        if (existsInDb) {
          return [];
        } else {
          try {
            await Contest.create(contestData);
          } catch (err) {
            console.error("Error creating CodeChef contest:", err);
          }
        }
      } catch (err) {
        console.error("Error checking CodeChef contest in DB:", err);
      }
    }
    console.log("codechef past contest updated in db");

    // return upcomingContests;
  } catch (error) {
    console.error("❌ Error fetching CodeChef contests:", error);
    return [];
  }
}

/** Fetch LeetCode Contests */
export async function fetchLeetCodeContests(): Promise<SelfContest[]> {
  try {
    const graphqlQuery = {
      query: `
        query getContestList {
          allContests {
            title
            startTime
            duration
            titleSlug
          }
        }
      `,
    };

    const response = await axios.post(
      "https://leetcode.com/graphql",
      graphqlQuery,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    // const contests = response.data.data.allContests;
    // console.log(contests);
    // return [];
    // Map upcoming contests to SelfContest format
    const allContests = response.data.data.allContests;
    const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds

    const upcomingContests = allContests
      .filter((contest: leetcodeContest) => contest.startTime > currentTime)
      .map((contest: leetcodeContest) => {
        const startTime = new Date(contest.startTime * 1000);
        const endTime = new Date((contest.startTime + contest.duration) * 1000);
        const contestData = {
          contestId: contest.titleSlug,
          name: contest.title,
          platform: "LeetCode",
          startTime: startTime,
          endTime: endTime,
          duration: contest.duration,
          url: `https://leetcode.com/contest/${contest.titleSlug}`,
          status: "upcoming" as ContestStatus,
        };
        return contestData;
      });

    // Process ongoing contests
    const ongoingContests = response.data.data.allContests.filter(
      (contest: any) =>
        !contest.isUpcoming &&
        new Date(contest.startTime * 1000) <= new Date() &&
        new Date((contest.startTime + contest.duration) * 1000) > new Date()
    );

    // Update status of contests that are no longer ongoing
    if (!ongoingContests.length) {
      await Contest.updateMany(
        { platform: "LeetCode", status: "ongoing" },
        { $set: { status: "past" } }
      );
    }

    // Process each ongoing contest
    for (const contest of ongoingContests) {
      const startTime = new Date(contest.startTime * 1000);
      const endTime = new Date((contest.startTime + contest.duration) * 1000);

      const contestData = {
        contestId: contest.titleSlug,
        name: contest.title,
        platform: "LeetCode",
        startTime: startTime,
        endTime: endTime,
        duration: contest.duration,
        url: `https://leetcode.com/contest/${contest.titleSlug}`,
        status: "ongoing" as ContestStatus,
      };

      try {
        const existsInDb = await Contest.findOne({
          contestId: contest.titleSlug,
        });
        if (!existsInDb) {
          try {
            await Contest.create(contestData);
          } catch (err) {
            console.error("Error creating LeetCode contest:", err);
          }
        }
      } catch (err) {
        console.error("Error checking LeetCode contest in DB:", err);
      }
    }

    return upcomingContests;
  } catch (error) {
    console.log("error in leetcode fetching contest:", error);
  }
  return [] as SelfContest[];
}

/** Fetch LeetCode Past Contests */
export async function fetchLeetCodePastContests() {
  try {
    const graphqlQuery = {
      query: `
        query getContestList {
          allContests {
            title
            startTime
            duration
            titleSlug
          }
        }
      `,
    };

    const response = await axios.post(
      "https://leetcode.com/graphql",
      graphqlQuery,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    const contestsToProcess = response.data.data.allContests.filter(
      (contest: any) =>
        !contest.isUpcoming &&
        new Date((contest.startTime + contest.duration) * 1000) <= new Date()
    );

    for (const contest of contestsToProcess) {
      const startTime = new Date(contest.startTime * 1000);
      const endTime = new Date((contest.startTime + contest.duration) * 1000);

      const contestData = {
        contestId: contest.titleSlug,
        name: contest.title,
        platform: "LeetCode",
        startTime: startTime,
        endTime: endTime,
        duration: contest.duration,
        url: `https://leetcode.com/contest/${contest.titleSlug}`,
        status: "past" as ContestStatus,
      };

      try {
        const existsInDb = await Contest.findOne({
          contestId: contest.titleSlug,
        });
        if (existsInDb) {
          return [];
        } else {
          try {
            await Contest.create(contestData);
          } catch (err) {
            console.error("Error creating LeetCode contest:", err);
          }
        }
      } catch (err) {
        console.error("Error checking LeetCode contest in DB:", err);
      }
    }
    console.log("leetcode past contest updated in db");
  } catch (error) {
    console.error("❌ Error fetching LeetCode past contests:", error);
    return [];
  }
}

/** Fetch All Contests */
export async function fetchAllContests() {
  // const [codeforces] = await Promise.all([fetchCodeforcesContests()]);

  const [codeforces, codechef, leetcode] = await Promise.all([
    fetchCodeforcesContests(),
    fetchCodeChefContests(),
    fetchLeetCodeContests(),
  ]);
  if (!(await Contest.findOne({ platform: "CodeChef" })))
    fetchCodeChefPastContests();
  if (!(await Contest.findOne({ platform: "LeetCode" })))
    fetchLeetCodePastContests();
  if (!(await Contest.findOne({ platform: "Codeforces" })))
    fetchCodeforcesPastContests();

  return [...codeforces, ...codechef, ...leetcode];
  // fetchCodeChefPastContests();
}
