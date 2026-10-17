import mongoose from 'mongoose';
import { timestamps, makeKey, toJSONWith } from './plugin.js';

const branchSchema = new mongoose.Schema(
  {
    branch_name: { type: String, required: true, trim: true, maxlength: 100 },
    branch_key: { type: String }, // lowercase copy of branch_name, used for unique/sort
    address: { type: String, required: true, trim: true, maxlength: 300 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    state: { type: String, required: true, trim: true, maxlength: 80 },
    pincode: { type: String, required: true, trim: true },
    mobile_no: { type: String, required: true, trim: true },
    // The User who is this branch's Sub Admin (one admin per branch).
    branch_admin_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
  },
  { timestamps, toJSON: toJSONWith('branch_id') }
);

branchSchema.pre('validate', function () { this.branch_key = makeKey(this.branch_name); });
branchSchema.index({ branch_key: 1 }, { unique: true });
branchSchema.index({ branch_admin_user_id: 1 }, { unique: true });

export default mongoose.model('Branch', branchSchema);
