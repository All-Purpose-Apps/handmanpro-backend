import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
  } catch (error) {
    console.error(error.message);
    process.exit(1); // Exit process with failure
  }
};

export default connectDB;
