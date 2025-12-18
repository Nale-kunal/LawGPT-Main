import mongoose from 'mongoose';

export async function connect() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lawyer_zen';
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, {
    autoIndex: true,
  });
  return mongoose.connection;
}



