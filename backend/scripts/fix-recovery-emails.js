const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const User = require('./src/models/User.js').default;

        // Unset any recoveryEmail fields that somehow got set to null
        const res = await User.collection.updateMany(
            { recoveryEmail: null },
            { $unset: { recoveryEmail: 1 } }
        );
        console.log(`Unset recoveryEmail from ${res.modifiedCount} documents.`);

        // Drop and recreate the recoveryEmail index to ensure sparse rules are applied
        try {
            await User.collection.dropIndex('recoveryEmail_1');
            console.log('Dropped old recoveryEmail index');
        } catch (e) {
            console.log('Index recoveryEmail_1 did not exist or could not be dropped:', e.message);
        }

        await User.collection.createIndex({ recoveryEmail: 1 }, { unique: true, sparse: true });
        console.log('Recreated recoveryEmail sparse unique index successfully.');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

run();
