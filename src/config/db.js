const mongoose = require('mongoose');
async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is missing. Copy .env.example to .env and configure MongoDB.');
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (error) {
    throw new Error(`MongoDB connection failed (${error.message}). Start MongoDB locally or set MONGODB_URI to a reachable MongoDB database.`);
  }
}
module.exports = connectDB;
