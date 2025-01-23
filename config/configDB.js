const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection parameters
const dbHost = process.env.DB_HOST;
const dbPort = process.env.DB_PORT;
const dbName = process.env.DB_NAME;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;

// Mongoose connection options
const connectionOptions = {
  // useNewUrlParser: true,
  // useUnifiedTopology: true,
  authSource: 'admin', // or another database if you use it for authentication
  user: dbUser,
  pass: dbPassword,
};

// Connection string without authentication
const mongoUri = `mongodb://${dbHost}:${dbPort}/${dbName}`;

const connectDB = async () => {
  try {
    await mongoose.connect(mongoUri, connectionOptions);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  }
};

module.exports = connectDB;
