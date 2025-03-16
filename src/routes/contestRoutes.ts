import express from "express";
import {
  getAllContests,
  getContest,
  getUpcomingContests,
  getByContestID,
} from "../controllers/contestController";
import { protect, authorize } from "../middleware/auth";
import solutionRouter from "./solutionRoutes";

const router = express.Router();

// Re-route into other resource routers
router.use("/:contestId/solutions", solutionRouter);

router
  .route("/")
  .get(getAllContests)

router.route("/upcoming").get(getUpcomingContests);

router.route("/contestId").get(getByContestID);

router
  .route("/:id")
  .get(getContest)

export default router;
