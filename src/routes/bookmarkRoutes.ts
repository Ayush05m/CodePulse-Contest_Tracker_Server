import express from "express"
import { getBookmarks, addBookmark, deleteBookmark, updateBookmark } from "../controllers/bookmarkController"
import { protect } from "../middleware/auth"

const router = express.Router()

router.route("/").get(protect, getBookmarks).post(protect, addBookmark)

router.route("/:id").put(protect, updateBookmark).delete(protect, deleteBookmark)

export default router

