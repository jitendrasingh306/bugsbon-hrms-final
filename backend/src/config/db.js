import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri);
  // Make sure unique indexes exist before we accept requests.
  await mongoose.connection.syncIndexes();
  console.log('MongoDB connected');
}
