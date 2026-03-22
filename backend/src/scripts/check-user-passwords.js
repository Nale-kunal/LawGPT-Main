/* eslint-disable no-console */
import mongoose from 'mongoose';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lawyer_zen';

async function checkUserPasswords() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Find all users
    const users = await User.find({});
    console.log(`Found ${users.length} users in database\n`);

    let validUsers = 0;
    let invalidUsers = 0;
    let usersWithoutHash = 0;

    for (const user of users) {
      console.log(`Checking user: ${user.email} (ID: ${user._id})`);

      if (!user.passwordHash) {
        console.log('  ❌ User has NO password hash');
        usersWithoutHash++;
      } else if (!user.passwordHash.startsWith('$2')) {
        console.log('  ❌ User has INVALID password hash format');
        console.log(`  Hash preview: ${user.passwordHash.substring(0, 20)}...`);
        invalidUsers++;
      } else {
        console.log('  ✅ User has valid password hash format');
        validUsers++;
      }
      console.log('');
    }

    console.log('\n=== SUMMARY ===');
    console.log(`Total users: ${users.length}`);
    console.log(`Valid password hashes: ${validUsers}`);
    console.log(`Invalid password hashes: ${invalidUsers}`);
    console.log(`Users without password hash: ${usersWithoutHash}`);

    if (invalidUsers > 0 || usersWithoutHash > 0) {
      console.log('\n⚠️  WARNING: Some users have invalid or missing password hashes.');
      console.log('These users will not be able to log in until they reset their passwords.');
      console.log('Recommendation: Use the password reset feature to fix these accounts.');
    }

  } catch (error) {
    console.error('Error checking user passwords:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkUserPasswords();





