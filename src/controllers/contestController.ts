import type { Request, Response, NextFunction } from "express";
import Contest from "../models/Contest";
import {
  SelfContest,
} from "../services/contestServices";
import asyncHandler from "../middleware/async";
import ErrorResponse from "../utils/errorResponse";
import { getCachedContests } from "../services/cacheServices";
type ContestStatus = "past" | "upcoming" | " ongoing";

// @desc    Get all contests
// @route   GET /api/contests
// @access  Public
export const getAllContests = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    console.log(req.query);
    // Build query
    const { platform, status, search } = req.query;

    const query: any = {};
    const page = Number.parseInt(req.query.page as string, 10) || 1;

    let cachedContests: SelfContest[] = [];
    if (page == 1 && (status === "" || status === "upcoming")) {
      cachedContests = (await getCachedContests()) || [];
    }

    if (search) {
      query.name = { $regex: search, $options: "i" };
      cachedContests = cachedContests.filter((contest) =>
        contest.name.toLowerCase().includes(search.toString())
      );
    }
    if (platform?.length) {
      query.platform = { $regex: platform, $options: "i" };
      cachedContests = cachedContests.filter(
        (contest) => contest.platform === platform
      );
    }
    if (status === "upcoming") {
      return res.status(200).json({
        success: true,
        count: cachedContests.length,
        data: cachedContests,
      });
    }

    if (status && status !== "") {
      query.status = status;
    }
    const limit =
      (Number.parseInt(req.query.limit as string, 10) || 12) -
      cachedContests?.length;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Contest.countDocuments(query);

    let contests = await Contest.find(query)
      .sort({ startTime: -1 })
      .skip(startIndex)
      .limit(limit)
      .populate("solutions")
      .populate("bookmarksCount");

    const convertedContest: SelfContest[] = contests.map((e) => ({
      contestId: e.contestId,
      name: e.name,
      startTime: e.startTime,
      endTime: e.endTime,
      duration: e.duration,
      platform: e.platform,
      url: e.url,
      status: e.status as ContestStatus,
    }));

    const contestsData = [...cachedContests, ...convertedContest];

    // Pagination result
    const pagination: any = {};
    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }
    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    res.status(200).json({
      success: true,
      count: contestsData.length,
      pagination,
      data: contestsData,
    });
  }
);

// @desc    Get single contest
// @route   GET /api/contests/:id
// @access  Public
export const getContest = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const contest = await Contest.findById(req.params.id)
      .populate("solutions")
      .populate("bookmarksCount");

    if (!contest) {
      return next(
        new ErrorResponse(`Contest not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: contest,
    });
  }
);

// @desc    Get contests from contest_id
// @route   GET /api/contests/:contest_id
// @access  Public
export const getByContestID = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { contestId } = req.query;
    // console.log(req.query);
    const cachedContests = await getCachedContests();
    let contest = cachedContests?.find(
      (c) => c.contestId === contestId
    ) as SelfContest;
    // console.log(contest)

    if (!contest) {
      contest = (await Contest.findOne({ contestId })) as SelfContest;
      // console.log("db Contest ",contest)
    }

    if (contest) {
      return res.json({
        success: true,
        data: { contest },
      });
    }
    return res.json({
      success: false,
      message: "Contest not found",
    });
  }
);

// @desc    Get all upcoming contests
// @route   GET /api/contests/upcoming
// @access  Public
export const getUpcomingContests = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        platform,
        search,
        page = 1,
        limit = 10,
        sort = "asc",
      } = req.query;
      console.log(req.query);

      // 🔥 Fetch data from Redis cache or MongoDB
      let contests: SelfContest[] = (await getCachedContests()) || [];
      if (!contests || contests.length === 0) {
        contests = (await Contest.find({
          startTime: { $gte: new Date() },
        }).lean()) as SelfContest[];
      }
      if (platform) {
        const platforms = platform.toString().split(",");
        contests = contests.filter((contest: SelfContest) =>
          platforms.includes(contest.platform)
        );
      }

      if (search) {
        const searchRegex = new RegExp(search.toString(), "i");
        contests = contests.filter((contest: SelfContest) =>
          searchRegex.test(contest.name)
        );
      }

      const pageNumber = Number(page) || 1;
      const pageSize = Number(limit) || 10;
      const total = contests.length;
      const startIndex = (pageNumber - 1) * pageSize;
      const paginatedContests = contests.slice(
        startIndex,
        startIndex + pageSize
      );
      const pagination: any = {};
      const endIndex = pageNumber * pageSize;

      if (endIndex < total) {
        pagination.next = {
          page: pageNumber + 1,
          limit,
        };
      }

      if (startIndex > 0) {
        pagination.prev = {
          page: pageNumber - 1,
          limit,
        };
      }

      res.status(200).json({
        success: true,
        count: paginatedContests.length,
        pagination,
        data: paginatedContests,
      });
    } catch (error) {
      console.error("Error fetching upcoming contests:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);