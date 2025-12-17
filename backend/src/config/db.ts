import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI!);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    // Fix: Use process.exit(1) directly as 'exit' is not an exported member of 'process'.
    process.exit(1);
  }
};

export default connectDB;