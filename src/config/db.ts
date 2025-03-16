import mongoose from "mongoose";

const connectDB = async (): Promise<void> =>   {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string || "mongodb://localhost:27017/", {dbName: "contest-tracker"});
    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
    process.exit(1);
  }
};

export default connectDB;
