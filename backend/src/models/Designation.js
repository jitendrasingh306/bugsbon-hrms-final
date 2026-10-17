import mongoose from 'mongoose';
import { timestamps, makeKey, toJSONWith } from './plugin.js';

// Job position (HOD, Developer, Intern...). NOT a system access role.
const designationSchema = new mongoose.Schema(
  {
    designation_name: { type: String, required: true, trim: true, maxlength: 100 },
    designation_key: { type: String }, // lowercase copy of designation_name
    description: { type: String, trim: true, maxlength: 500 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
  },
  { timestamps, toJSON: toJSONWith('designation_id') }
);

// A designation name is unique inside one department.
designationSchema.pre('validate', function () { this.designation_key = makeKey(this.designation_name); });
designationSchema.index({ department_id: 1, designation_key: 1 }, { unique: true });

export default mongoose.model('Designation', designationSchema);
