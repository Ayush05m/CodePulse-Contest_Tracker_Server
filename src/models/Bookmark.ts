import mongoose, { type Document, Schema } from "mongoose"

export interface IBookmark extends Document {
  user: mongoose.Types.ObjectId
  contest: mongoose.Types.ObjectId
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const BookmarkSchema: Schema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    contest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contest",
      required: [true, "Contest ID is required"],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [200, "Notes cannot be more than 200 characters"],
    },
  },
  {
    timestamps: true,
  },
)

// Compound index to ensure a user can bookmark a contest only once
BookmarkSchema.index({ user: 1, contest: 1 }, { unique: true })

export default mongoose.model<IBookmark>("Bookmark", BookmarkSchema)

