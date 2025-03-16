import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.YOUTUBE_API_KEY;
const BASE_URL = "https://www.googleapis.com/youtube/v3/playlistItems";

export interface Video {
  title: string;
  url: string;
  thumbnail: string;
  description: string;
}

export async function getPlaylistVideos(playlistId: string): Promise<Video[]> {
  let nextPageToken = "";
  let videos: Video[] = [];

  try {
    do {
      const response = await axios.get(BASE_URL, {
        params: {
          part: "snippet",
          maxResults: 50,
          playlistId,
          key: API_KEY,
          pageToken: nextPageToken,
        },
      });

      response.data.items.forEach((item: any) => {
        const videoId = item.snippet.resourceId.videoId;
        let title = item.snippet.title;
        if (
          item.snippet.resourceId.kind == "youtube#video" &&
          item.snippet.title != "Private video"
        ) {
          videos.push({
            title,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            thumbnail: item.snippet.thumbnails.standard.url,
            description: item.snippet.description.split("\n")[0].trim(),
          });
        }
      });

      nextPageToken = response.data.nextPageToken || "";
    } while (nextPageToken);
  } catch (error) {
    console.error("Error fetching playlist videos:", error);
  }

  //   console.log(videos[0].description);

  return videos;
}

export function formatCodeforcesVideoTitle(videoTitle: string): string {
  // Remove any leading/trailing whitespace and extra characters
  const cleanTitle = videoTitle.trim().replace(/\*\*/g, "").trim();

  let formattedId = "";

  // Check if it's an Educational round
  if (cleanTitle.includes("Educational")) {
    const roundMatch = cleanTitle.match(/Educational Codeforces Round (\d+)/i);
    if (roundMatch && roundMatch[1]) {
      formattedId = `educational-codeforces-round-${roundMatch[1]}`;
    }
  } else if (cleanTitle.includes("Codeforces Round")) {
    const roundMatch = cleanTitle.match(/Codeforces Round (\d+)/i);

    if (roundMatch && roundMatch[1]) {
      formattedId = `codeforces-round-${roundMatch[1]}`;

      // Check for division information
      const divMatch = cleanTitle.match(/\(Div (\d+)(?:\s*\+\s*Div (\d+))?\)/i);

      if (divMatch) {
        // Single division
        if (divMatch[1] && !divMatch[2]) {
          formattedId += `-div-${divMatch[1]}`;
        }
        // Div 1 + Div 2
        else if (divMatch[1] && divMatch[2]) {
          formattedId += `-div-1-plus-2`;
        }
      }
    }
  }

  // If no specific format was matched, use a fallback
  if (!formattedId) {
    formattedId = cleanTitle
      .toLowerCase()
      .replace(/[^\w\s]/gi, "")
      .replace(/\s+/g, "-");
  }

  return formattedId;
}
