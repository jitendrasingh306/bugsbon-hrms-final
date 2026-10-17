import mongoose from 'mongoose';
import { timestamps, makeKey, toJSONWith } from './plugin.js';

const departmentSchema = new mongoose.Schema(
  {
    department_name: { type: String, required: true, trim: true, maxlength: 100 },
    department_key: { type: String }, // lowercase copy of department_name
    description: { type: String, trim: true, maxlength: 500 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
  },
  { timestamps, toJSON: toJSONWith('department_id') }
);

// A department name is unique inside one branch.
departmentSchema.pre('validate', function () { this.department_key = makeKey(this.department_name); });
departmentSchema.index({ branch_id: 1, department_key: 1 }, { unique: true });

export default mongoose.model('Department', departmentSchema);
