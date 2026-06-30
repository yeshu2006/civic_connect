const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const seedAdmin = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/civicsense';
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Remove all users
    await User.deleteMany({});
    console.log('Cleared all existing users.');

    // Create an admin user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Admin@123', salt);

    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@gov.com',
      password: hashedPassword,
      role: 'Admin',
      trustScore: 100,
    });

    console.log('Admin user created successfully:');
    console.log(`Email: ${admin.email}`);
    console.log(`Password: Admin@123`);
    console.log(`Role: ${admin.role}`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
