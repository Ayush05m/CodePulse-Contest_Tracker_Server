import express from "express"
import { register, login, getMe, logout } from "../controllers/authController"
import { protect } from "../middleware/auth"

const router = express.Router()

router.post("/register", register)
router.post("/login", login)
router.get("/me", protect, getMe)
router.get("/logout", logout)

export default router

