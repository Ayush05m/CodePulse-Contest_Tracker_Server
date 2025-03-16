import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import asyncHandler from "./async";
import ErrorResponse from "../utils/errorResponse";
import User from "../models/User";

declare module "express-serve-static-core" {
  interface Request {
    user?: { id: string; name: string; email: string; role: string } | null;
  }
}

// Protect routes
export const protect = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      // Set token from Bearer token in header
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.token) {
      // Set token from cookie
      token = req.cookies.token;
    }

    // Make sure token exists
    if (!token) {
      return next(
        new ErrorResponse("Not authorized to access this route", 401)
      );
    }

    try {
      // Verify token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "secret"
      ) as any;

      req.user = await User.findById(decoded.id);

      next();
    } catch (err) {
      return next(
        new ErrorResponse("Not authorized to access this route", 401)
      );
    }
  }
);

// Grant access to specific roles
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req?.user?.role || "")) {
      return next(
        new ErrorResponse(
          `User role ${req?.user?.role} is not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};
