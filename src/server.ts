import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import errorHandler from "./middleware/error";
import contestRoutes from "./routes/contestRoutes";
import bookmarkRoutes from "./routes/bookmarkRoutes";
import solutionRoutes from "./routes/solutionRoutes";
import authRoutes from "./routes/authRoutes";
import connectDB from "./config/db";
import { connectRedis } from "./config/redis";
import "./jobs/contestJobs";
import { clearCache } from "./services/cacheServices";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// routes
app.use("/api/auth", authRoutes);
app.use("/api/contests", contestRoutes);
app.use("/api/bookmarks", bookmarkRoutes);
app.use("/api/solutions", solutionRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB(); // Connect to MongoDB
    await connectRedis(); // Connect to Redis
    // clearCache();
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (error) {
    console.error("❌ Server startup error:", error);
  }
};
startServer();
