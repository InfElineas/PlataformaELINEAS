import mongoose from 'mongoose';

let MONGODB_URI, DB_NAME;

function checkEnv() {
  MONGODB_URI = process.env.MONGO_URL;
  DB_NAME = process.env.DB_NAME || 'inventory_replenishment_db';
  
  if (!MONGODB_URI) {
    throw new Error('Please define MONGO_URL in .env');
  }
}

const globalForMongoose = globalThis;

let cached = globalForMongoose.mongoose;

if (!cached) {
  cached = globalForMongoose.mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  checkEnv();
  
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      dbName: DB_NAME,
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('✅ MongoDB connected:', DB_NAME);
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;