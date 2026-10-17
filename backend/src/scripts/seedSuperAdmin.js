// Creates the first Super Admin from values in backend/.env.
// Safe to re-run: it refuses to create a second Super Admin.
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { checkEnv, env } from '../config/env.js';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import { validate, validatePassword } from '../utils/http.js';

checkEnv();

try {
  const { SEED_ADMIN_NAME, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD } = process.env;
  const data = validate(
    { name: SEED_ADMIN_NAME, email: SEED_ADMIN_EMAIL, mobile_no: process.env.SEED_ADMIN_MOBILE || '0000000000' },
    { name: { required: true, label: 'SEED_ADMIN_NAME' }, email: { type: 'email', required: true, label: 'SEED_ADMIN_EMAIL' }, mobile_no: { type: 'phone', required: true } }
  );
  validatePassword(SEED_ADMIN_PASSWORD, 'SEED_ADMIN_PASSWORD');

  await connectDB();
  const existing = await User.findOne({ system_role: 'super_admin' });
  if (existing) {
    console.log(`A Super Admin already exists (${existing.email}). Nothing was changed.`);
  } else {
    await User.create({ ...data, password_hash: await bcrypt.hash(SEED_ADMIN_PASSWORD, 12), system_role: 'super_admin' });
    console.log(`Super Admin created: ${data.email}`);
    console.log('You can now remove SEED_ADMIN_PASSWORD from backend/.env.');
  }
} catch (err) {
  console.error('Seed failed:', err.fields ? JSON.stringify(err.fields) : err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
