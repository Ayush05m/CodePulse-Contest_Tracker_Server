import mongoose, { type Document, Schema } from "mongoose";

export interface ISolution extends Document {
  contest_id: mongoose.Types.ObjectId;
  youtubeLinks: {
    url: string;
    title: string;
    description?: string;
    thumbnail: string;
  }[];
  submittedBy: mongoose.Types.ObjectId;
  votes: {
    upvotes: number;
    downvotes: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SolutionSchema: Schema = new Schema(
  {
    contest_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contest",
      required: [true, "Contest ID is required"],
    },
    youtubeLinks: {
      type: [
        {
          thumbnail: {
            type: String,
            required: [true, "Thumbnail Url is required"],
            trim: true,
          },
          url: {
            type: String,
            required: [true, "YouTube link is required"],
            trim: true,
            validate: {
              validator: (v: string) =>
                /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/.test(v),
              message: (props) => `${props.value} is not a valid YouTube link!`,
            },
          },
          title: {
            type: String,
            required: [true, "Title is required"],
            trim: true,
            maxlength: [100, "Title cannot be more than 100 characters"],
          },
          description: {
            type: String,
            trim: true,
            maxlength: [500, "Description cannot be more than 500 characters"],
          },
        },
      ],
      required: [true, "At least one YouTube link is required"],
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    votes: {
      upvotes: {
        type: Number,
        default: 0,
      },
      downvotes: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ISolution>("Solution", SolutionSchema);
