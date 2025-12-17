import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './src/config/db.js';
import Job from './src/models/Job.js';

dotenv.config();

const testDB = async () => {
  try {
    await connectDB();
    console.log('MongoDB connected for test');

    const testJob = new Job({
      companyName: 'Test Company',
      title: 'Test Job',
      summary: 'This is a test job summary.',
      requiredSkills: ['test', 'debug'],
      experience: '1 year',
    });

    console.log('Creating test job:', testJob);
    await testJob.save();
    console.log('Test job saved successfully!');

  } catch (error) {
    console.error('Error during database test:', error);
  } finally {
    mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
};

testDB();