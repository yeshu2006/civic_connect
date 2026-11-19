import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

import User from './models/User.js';
import Issue from './models/Issue.js';
import Vote from './models/Vote.js';

async function clearComplaints() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected successfully.');

    // 1. Delete all issues (complaints)
    const issueResult = await Issue.deleteMany({});
    console.log(`Successfully deleted all complaints/issues: ${issueResult.deletedCount} removed.`);

    // 2. Delete all votes
    const voteResult = await Vote.deleteMany({});
    console.log(`Successfully deleted all votes: ${voteResult.deletedCount} removed.`);

    // 3. Remove temporary automated test runner accounts
    const testUsersResult = await User.deleteMany({
      email: { $regex: /(test\.citizen|marketplace-seed)/i }
    });
    console.log(`Cleaned up temporary test runner accounts: ${testUsersResult.deletedCount} removed.`);

    // 4. Verify state
    const issueCount = await Issue.countDocuments();
    const voteCount = await Vote.countDocuments();
    const users = await User.find({})
      .select('name email role department')
      .sort({ role: 1, department: 1, name: 1 })
      .lean();

    console.log('\n================ Current Database State ================');
    console.log(`Total Complaints / Issues in DB: ${issueCount}`);
    console.log(`Total Votes in DB: ${voteCount}`);
    console.log(`Total Active Users & Admins in DB: ${users.length}`);
    console.log('--------------------------------------------------------');
    users.forEach((u, i) => {
      console.log(
        `  ${i + 1}. [${u.role.toUpperCase()}${u.department ? ` - ${u.department}` : ''}] ${u.name} <${u.email}>`
      );
    });
    console.log('========================================================\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Error clearing complaints:', err);
    process.exit(1);
  }
}

clearComplaints();
