import type { Request, Response, NextFunction } from "express";
import Solution from "../models/Solution";
import Contest from "../models/Contest";
import asyncHandler from "../middleware/async";
import ErrorResponse from "../utils/errorResponse";
import { start } from "node:repl";

// @desc    Get all solutions
// @route   GET /api/solutions
// @access  Public
export const getSolutions = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    let query;

    // Copy req.query
    const reqQuery = { ...req.query };

    // Fields to exclude
    const removeFields = ["select", "sort", "page", "limit"];

    // Loop over removeFields and delete them from reqQuery
    removeFields.forEach((param) => delete reqQuery[param]);

    // Create query string
    let queryStr = JSON.stringify(reqQuery);

    // Create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(
      /\b(gt|gte|lt|lte|in)\b/g,
      (match) => `$${match}`
    );

    // Finding resource
    query = Solution.find(JSON.parse(queryStr))
      .populate({
        path: "contest",
        select: "name platform startTime",
      })
      .populate({
        path: "submittedBy",
        select: "name",
      });

    // Select Fields
    if (req.query.select) {
      const fields = (req.query.select as string).split(",").join(" ");
      query = query.select(fields);
    }

    // Sort
    if (req.query.sort) {
      const sortBy = (req.query.sort as string).split(",").join(" ");
      query = query.sort(sortBy);
    } else {
      query = query.sort("-createdAt");
    }

    // Pagination
    const page = Number.parseInt(req.query.page as string, 10) || 1;
    const limit = Number.parseInt(req.query.limit as string, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Solution.countDocuments(JSON.parse(queryStr));

    query = query.skip(startIndex).limit(limit);

    // Executing query
    const solutions = await query;

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
      count: solutions.length,
      pagination,
      data: solutions,
    });
  }
);

// @desc    Get solutions from contestId
// @route   GET /api/solutions/contestId/:contestId
// @access  Public
export const getSolutionByContestID = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log(req.params);
      const { contestId } = req.params;

      const contest = await Contest.findOne({ contestId });
      console.log(contest);
      const solution = await Solution.findOne({ contest_id: contest?._id });
      console.log(solution);

      if (!solution) {
        return res.json({
          success: false,
          message: "No solutions found for this contest.",
        });
      }

      res.status(200).json({ success: true, data: solution });
    } catch (error) {
      console.error("Error fetching solutions:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }
);

// @desc    Get solutions for a contest with pagination
// @route   GET /api/contests/:contestId/solutions
// @access  Public
export const getContestSolutions = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { search, sort, page: pageStr, limit: limitStr } = req.query;

    // Parse and validate pagination parameters
    let page = parseInt(pageStr as string, 10) || 1;
    let limit = parseInt(limitStr as string, 10) || 10;
    page = Math.max(1, page);
    limit = Math.max(1, limit);
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    // Build filter conditions
    const filter: any = { contest: req.params.contestId };
    if (search) {
      filter.$or = [
        { title: { $regex: search as string, $options: "i" } },
        { description: { $regex: search as string, $options: "i" } },
      ];
    }

    // Configure sorting (- denotes descending)
    const sortBy = sort ? String(sort) : "-createdAt";

    // Execute parallel queries for total count and paginated results
    const [total, solutions] = await Promise.all([
      Solution.countDocuments(filter),
      Solution.find(filter)
        .sort(sortBy)
        .skip(startIndex)
        .limit(limit)
        .populate({
          path: "submittedBy",
          select: "name",
        }),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
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
      count: total,
      pagination,
      data: solutions,
    });
  }
);

// @desc    Get single solution
// @route   GET /api/solutions/:id
// @access  Public
export const getSolution = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const solution = await Solution.findById(req.params.id)
      .populate({
        path: "contest",
        select: "name platform startTime",
      })
      .populate({
        path: "submittedBy",
        select: "name",
      });

    if (!solution) {
      return next(
        new ErrorResponse(`Solution not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: solution,
    });
  }
);

// @desc    Add solution
// @route   POST /api/contests/:contestId/solutions
// @access  Private
export const addSolution = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    req.body.contest = req.params.contestId;
    req.body.submittedBy = req.user?.id;

    const contest = await Contest.findById(req.params.contestId);

    if (!contest) {
      return next(
        new ErrorResponse(
          `Contest not found with id of ${req.params.contestId}`,
          404
        )
      );
    }

    const solution = await Solution.create(req.body);

    res.status(201).json({
      success: true,
      data: solution,
    });
  }
);

// @desc    Update solution
// @route   PUT /api/solutions/:id
// @access  Private
export const updateSolution = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    let solution = await Solution.findById(req.params.id);

    if (!solution) {
      return next(
        new ErrorResponse(`Solution not found with id of ${req.params.id}`, 404)
      );
    }

    // Make sure user is solution owner
    if (
      solution.submittedBy.toString() !== req.user?.id &&
      req.user?.role !== "admin"
    ) {
      return next(
        new ErrorResponse("Not authorized to update this solution", 401)
      );
    }

    solution = await Solution.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: solution,
    });
  }
);

// @desc    Delete solution
// @route   DELETE /api/solutions/:id
// @access  Private
export const deleteSolution = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const solution = await Solution.findByIdAndDelete(req.params.id);

    if (!solution) {
      return next(
        new ErrorResponse(`Solution not found with id of ${req.params.id}`, 404)
      );
    }

    // Make sure user is solution owner
    if (
      solution.submittedBy.toString() !== req.user?.id &&
      req.user?.role !== "admin"
    ) {
      return next(
        new ErrorResponse("Not authorized to delete this solution", 401)
      );
    }

    res.status(200).json({
      success: true,
      data: {},
    });
  }
);

// @desc    Vote on a solution
// @route   PUT /api/solutions/:id/vote
// @access  Private
export const voteSolution = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { voteType } = req.body;

    if (!voteType || !["upvote", "downvote"].includes(voteType)) {
      return next(
        new ErrorResponse(
          "Please provide a valid vote type (upvote or downvote)",
          400
        )
      );
    }

    let solution = await Solution.findById(req.params.id);

    if (!solution) {
      return next(
        new ErrorResponse(`Solution not found with id of ${req.params.id}`, 404)
      );
    }

    // Update vote count
    const updateField =
      voteType === "upvote" ? "votes.upvotes" : "votes.downvotes";
    const updateValue =
      voteType === "upvote"
        ? solution.votes.upvotes + 1
        : solution.votes.downvotes + 1;

    solution = await Solution.findByIdAndUpdate(
      req.params.id,
      { [updateField]: updateValue },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: solution,
    });
  }
);
