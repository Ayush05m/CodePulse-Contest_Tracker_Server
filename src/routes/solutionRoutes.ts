import express from "express"
import {
  getSolution,
  addSolution,
  updateSolution,
  deleteSolution,
  getContestSolutions,
  voteSolution,
  getSolutionByContestID,
  getSolutions,
} from "../controllers/solutionController"
import { protect } from "../middleware/auth"

const router = express.Router({ mergeParams: true })

router.route("/").get(getContestSolutions).post(protect, addSolution)

router.route("/:id").get(getSolution).put(protect, updateSolution).delete(protect, deleteSolution)

router.route("/:id/vote").put(protect, voteSolution)

router.get("/contestId/:contestId", getSolutionByContestID);

export default router

