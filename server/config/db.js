import mongoose from 'mongoose';

let mongodInstance = null;

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  try {
    if (uri && uri.trim() !== '') {
      console.log('Connecting to provided MongoDB URI...');
      await mongoose.connect(uri);
      console.log('MongoDB Connected to provided database URI successfully.');
      return;
    }
  } catch (err) {
    console.warn('Failed to connect to provided MONGODB_URI:', err.message);
    console.log('Falling back to local in-memory MongoDB server for development...');
  }

  // Fallback to MongoMemoryServer for standalone zero-config reliability
  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    mongodInstance = await MongoMemoryServer.create({
      instance: {
        dbName: 'civicconnect'
      }
    });
    const memoryUri = mongodInstance.getUri();
    console.log(`Starting Embedded MongoDB Memory Server at: ${memoryUri}`);
    await mongoose.connect(memoryUri);
    console.log('MongoDB Connected via in-memory server successfully.');
  } catch (err) {
    console.error('Fatal: Could not connect to any MongoDB instance:', err.message);
    process.exit(1);
  }
};

export const closeDB = async () => {
  try {
    await mongoose.connection.close();
    if (mongodInstance) {
      await mongodInstance.stop();
    }
  } catch (err) {
    console.error('Error closing database connection:', err);
  }
};
