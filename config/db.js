/**
 * Database Configuration & Connection Pool Management
 * Native MongoDB Driver Implementation (STRICT: No Mongoose)
 */

const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'placement_management_db';

const MAX_POOL_SIZE = parseInt(process.env.MONGO_MAX_POOL_SIZE, 10) || 20;
const MIN_POOL_SIZE = parseInt(process.env.MONGO_MIN_POOL_SIZE, 10) || 5;

// Singleton client and db instances
let client = null;
let db = null;
let connectionPromise = null;

/**
 * Initialize indexes for high performance and integrity
 */
async function initIndexes(database) {
  try {
    const studentsCol = database.collection('students');
    const drivesCol = database.collection('drives');

    // 1. Unique index on rollNo
    await studentsCol.createIndex({ rollNo: 1 }, { unique: true });

    // 2. Compound/Single indexes for filtering & sorting
    await studentsCol.createIndex({ branch: 1, cgpa: -1 });
    await studentsCol.createIndex({ placementStatus: 1 });
    
    // 3. Text search index on name and skills
    await studentsCol.createIndex({ name: 'text', skills: 'text' });

    // 4. Drives indexes
    await drivesCol.createIndex({ status: 1 });
    await drivesCol.createIndex({ deadline: 1 });
    await drivesCol.createIndex({ 'applicants.studentId': 1 });

    console.log('✅ [Database] Indexes initialized successfully.');
  } catch (error) {
    console.warn('⚠️ [Database] Index initialization note:', error.message);
  }
}

/**
 * Connect to MongoDB using the Native Driver with connection pooling
 * @returns {Promise<Db>} Connected Database instance
 */
async function connectDB() {
  if (db && client) {
    return db;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    try {
      console.log(`🔌 [Database] Connecting to MongoDB: ${MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);

      client = new MongoClient(MONGO_URI, {
        maxPoolSize: MAX_POOL_SIZE,
        minPoolSize: MIN_POOL_SIZE,
        connectTimeoutMS: 10000,
        serverSelectionTimeoutMS: 5000,
        serverApi: {
          version: ServerApiVersion.v1,
          strict: false,
          deprecationErrors: true,
        }
      });

      await client.connect();
      db = client.db(DB_NAME);

      // Verify ping
      await db.command({ ping: 1 });
      console.log(`🚀 [Database] Connected successfully to database: "${DB_NAME}"`);
      console.log(`📊 [Database] Connection Pool: min=${MIN_POOL_SIZE}, max=${MAX_POOL_SIZE}`);

      // Create required indexes
      await initIndexes(db);

      return db;
    } catch (err) {
      connectionPromise = null;
      client = null;
      db = null;
      console.error('❌ [Database] Connection failed:', err.message);
      throw err;
    }
  })();

  return connectionPromise;
}

/**
 * Retrieve the active database instance (Singleton)
 * @returns {Db}
 */
function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Please call connectDB() first.');
  }
  return db;
}

/**
 * Close MongoDB connection cleanly
 */
async function closeDB() {
  if (client) {
    console.log('🛑 [Database] Closing MongoDB connection pool...');
    await client.close();
    client = null;
    db = null;
    console.log('🔒 [Database] MongoDB connection pool closed.');
  }
}

// Graceful shutdown handlers
const handleExit = async (signal) => {
  console.log(`\n⚠️  [Process] Received ${signal}. Starting graceful shutdown...`);
  try {
    await closeDB();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during database disconnect:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => handleExit('SIGINT'));
process.on('SIGTERM', () => handleExit('SIGTERM'));

module.exports = {
  connectDB,
  getDB,
  closeDB
};
