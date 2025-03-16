import type { Request, Response, NextFunction } from "express";
import Bookmark from "../models/Bookmark";
import Contest from "../models/Contest";
import asyncHandler from "../middleware/async";
import ErrorResponse from "../utils/errorResponse";

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
    req.body.user = req.user?.id;

    // Check if contest exists
    const contest = await Contest.findById(req.body.contest);

    if (!contest) {
      return next(
        new ErrorResponse(
          `Contest not found with id of ${req.body.contest}`,
          404
        )
      );
    }

    // Check if bookmark already exists
    const existingBookmark = await Bookmark.findOne({
      user: req.user?.id,
      contest: req.body.contest,
    });

    if (existingBookmark) {
      return next(new ErrorResponse("Contest already bookmarked", 400));
    }

    const bookmark = await Bookmark.create(req.body);

    res.status(201).json({
      success: true,
      data: bookmark,
    });
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
