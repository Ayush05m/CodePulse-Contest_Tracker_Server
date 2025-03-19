import type { Request, Response, NextFunction } from "express";
import Bookmark from "../models/Bookmark";
import Contest from "../models/Contest";
import asyncHandler from "../middleware/async";
import ErrorResponse from "../utils/errorResponse";
import { getCachedContests } from "../services/cacheServices";

// @desc    Get all bookmarks for a user
// @route   GET /api/bookmarks
// @access  Private
export const getBookmarks = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const bookmarks = await Bookmark.find({ user: req.user?.id }).populate({
      path: "contest",
      select: "name platform startTime endTime status",
    });

    res.status(200).json({
      success: true,
      count: bookmarks.length,
      data: bookmarks,
    });
  }
);

// @desc    Add bookmark
// @route   POST /api/bookmarks
// @access  Private
export const addBookmark = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    console.log(req.body);
    req.body.user = req.user?.id;
    let contest = await Contest.findOne({ contestId: req.body.contest });
    if (!contest) {
      const cachedContest = await getCachedContests();
      const contest = cachedContest?.find(
        (contest) => contest.contestId === req.body.contest
      );
      console.log(contest);
    }

    const existingBookmark = await Bookmark.findOne({
      user: req.user?.id,
      contest: req.body.contest,
    });
    if (existingBookmark)
      return next(new ErrorResponse("Already bookmarked", 400));

    let bookmark = await Bookmark.create(req.body);
    let bookmarkData = await Bookmark.findById(bookmark._id).populate({
      path: "contest",
      select: "contestId name platform startTime duration status",
    });

    res.status(201).json({ success: true, data: bookmarkData });
  }
);

// @desc    Delete bookmark
// @route   DELETE /api/bookmarks/:id
// @access  Private
export const deleteBookmark = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const bookmark = await Bookmark.findByIdAndDelete(req.params.id);

    if (!bookmark) {
      return next(
        new ErrorResponse(`Bookmark not found with id of ${req.params.id}`, 404)
      );
    }

    // Make sure user owns bookmark
    if (
      bookmark.user.toString() !== req.user?.id &&
      req.user?.role !== "admin"
    ) {
      return next(
        new ErrorResponse("Not authorized to delete this bookmark", 401)
      );
    }

    res.status(200).json({
      success: true,
      data: {},
    });
  }
);

// @desc    Update bookmark notes
// @route   PUT /api/bookmarks/:id
// @access  Private
export const updateBookmark = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    let bookmark = await Bookmark.findById(req.params.id);

    if (!bookmark) {
      return next(
        new ErrorResponse(`Bookmark not found with id of ${req.params.id}`, 404)
      );
    }

    // Make sure user owns bookmark
    if (
      bookmark.user.toString() !== req.user?.id &&
      req.user?.role !== "admin"
    ) {
      return next(
        new ErrorResponse("Not authorized to update this bookmark", 401)
      );
    }

    bookmark = await Bookmark.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: bookmark,
    });
  }
);
