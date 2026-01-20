import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const connection = await mongoose.connect(
      process.env.MONGO_URI || "mongodb://localhost:27017/seat-booking"
    );
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};
