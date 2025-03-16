import mongoose, { type Document, Schema } from "mongoose";

export interface IContest extends Document {
  contestId: string;
  name: string;
  platform: string;
  url?: string;
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes
  status: "upcoming" | "ongoing" | "past";
  createdAt?: Date;
  updatedAt?: Date;
  solutionLink?: string[];
}

const ContestSchema: Schema = new Schema(
  {
    contestId: {
      type: String,
      required: [true, "Contest ID is required"],
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Contest name is required"],
      trim: true,
      maxlength: [200, "Contest name cannot be more than 100 characters"],
    },
    platform: {
      type: String,
      required: [true, "Platform is required"],
      enum: {
        values: ["Codeforces", "CodeChef", "LeetCode"],
        message: "{VALUE} is not supported as a platform",
      },
    },
    url: {
      type: String,
      // required: [true, "Contest URL is required"],
      trim: true,
    },
    startTime: {
      type: Date,
      required: [true, "Start time is required"],
    },
    endTime: {
      type: Date,
      required: [true, "End time is required"],
    },
    duration: {
      type: Number,
      required: [true, "Duration is required"],
      min: [1, "Duration must be at least 1 minute"],
    },
    status: {
      type: String,
      required: [true, "Status is required"],
      enum: {
        values: ["upcoming", "ongoing", "past"],
        message: "{VALUE} is not a valid status",
      },
      default: "upcoming",
    },
    type: {
      type: String,
    },
    solutionLink: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for efficient querying
ContestSchema.index({ platform: 1, startTime: 1 });
ContestSchema.index({ status: 1 });

// Virtual for solutions
ContestSchema.virtual("solutions", {
  ref: "Solution",
  localField: "_id",
  foreignField: "contest",
  justOne: false,
});

// Virtual for bookmarks count
ContestSchema.virtual("bookmarksCount", {
  ref: "Bookmark",
  localField: "_id",
  foreignField: "contest",
  count: true,
});

export default mongoose.model<IContest>("Contest", ContestSchema);
