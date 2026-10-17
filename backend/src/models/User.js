import mongoose from 'mongoose';
import { timestamps, toJSONWith } from './plugin.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 150,
    },
    mobile_no: { type: String, required: true, trim: true },

    // Login password is stored only as a bcrypt hash.
    password_hash: { type: String, select: false },

    photo_url: { type: String, trim: true, maxlength: 500 },
    joining_date: { type: Date },
    leaving_date: { type: Date },

    // Monthly salary
    monthly_salary: {
      type: Number,
      min: 0,
      default: undefined,
    },

    // Previous employment details
    previous_experience_years: {
      type: Number,
      min: 0,
      default: undefined,
    },
    previous_company: {
      type: String,
      trim: true,
      maxlength: 150,
    },
    previous_company_leaving_date: {
      type: Date,
    },
    previous_leaving_reason: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    experience_letter_url: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    is_active: { type: Boolean, default: true },
    last_login_at: { type: Date },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    system_role: {
      type: String,
      enum: ['super_admin', 'sub_admin', 'employee'],
      default: 'employee',
      index: true,
    },

    branch_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      index: true,
    },
    department_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      index: true,
    },
    designation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Designation',
      index: true,
    },
  },
  {
    timestamps,
    toJSON: toJSONWith('user_id'),
  }
);

userSchema.index({ email: 1 }, { unique: true });

export default mongoose.model('User', userSchema);