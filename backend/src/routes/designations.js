import { Router } from 'express';
import mongoose from 'mongoose';
import Department from '../models/Department.js';
import Designation from '../models/Designation.js';
import User from '../models/User.js';
import { HttpError, asyncHandler, isId, validate } from '../utils/http.js';
import { assertInScope, isSuper, scopedBranchId } from '../utils/access.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const rules = {
  designation_name: { required: true, max: 100, label: 'Designation name' },
  description: { max: 500, label: 'Description' },
};

async function findInScope(req) {
  const d = mongoose.isValidObjectId(req.params.id) ? await Designation.findById(req.params.id) : null;
  if (!d) throw new HttpError(404, 'Designation not found');
  const dept = await Department.findById(d.department_id);
  if (!dept) throw new HttpError(404, 'Designation not found');
  assertInScope(req, dept.branch_id);
  return { designation: d, department: dept };
}

router.get('/', asyncHandler(async (req, res) => {
  const filter = {};
  // A designation belongs to a department, and the department to a branch.
  const deptFilter = {};
  const scope = scopedBranchId(req);
  if (scope) deptFilter.branch_id = scope;
  else if (isId(req.query.branch_id)) deptFilter.branch_id = req.query.branch_id;
  if (Object.keys(deptFilter).length) {
    const depts = await Department.find(deptFilter).select('_id');
    filter.department_id = { $in: depts.map((d) => d._id) };
  }
  if (isId(req.query.department_id)) {
    if (filter.department_id) {
      const allowed = filter.department_id.$in.map(String);
      filter.department_id = allowed.includes(req.query.department_id) ? req.query.department_id : { $in: [] };
    } else filter.department_id = req.query.department_id;
  }
  if (['active', 'inactive'].includes(req.query.status)) filter.status = req.query.status;
  res.json(await Designation.find(filter).sort({ designation_key: 1 }));
}));

router.post('/', asyncHandler(async (req, res) => {
  const data = validate(req.body, { ...rules, department_id: { type: 'id', required: true, label: 'Department' } });
  const dept = await Department.findById(data.department_id);
  // A Sub Admin naming another branch's department just gets "not found".
  if (!dept || (!isSuper(req) && String(dept.branch_id) !== String(req.user.branch_id))) {
    throw new HttpError(400, 'Please fix the highlighted fields', { department_id: 'Department not found' });
  }
  if (dept.status !== 'active') throw new HttpError(400, 'Please fix the highlighted fields', { department_id: 'Department is inactive' });
  const designation = await Designation.create({
    designation_name: data.designation_name,
    description: data.description ?? undefined,
    department_id: dept._id,
  });
  res.status(201).json(designation);
}));

// A designation can't move to another department (employees rely on it).
router.put('/:id', asyncHandler(async (req, res) => {
  const { designation } = await findInScope(req);
  const data = validate(req.body, rules);
  designation.designation_name = data.designation_name;
  designation.description = data.description ?? undefined;
  await designation.save();
  res.json(designation);
}));

router.patch('/:id/status', asyncHandler(async (req, res) => {
  const { status } = validate(req.body, { status: { type: 'enum', values: ['active', 'inactive'], required: true, label: 'Status' } });
  const { designation, department } = await findInScope(req);
  if (status === 'inactive') {
    const people = await User.countDocuments({ designation_id: designation._id, is_active: true });
    if (people) throw new HttpError(409, `Cannot deactivate: ${people} active employee(s) still hold this designation. Move them first.`);
  } else if (department.status !== 'active') {
    throw new HttpError(409, 'Activate the department first');
  }
  designation.status = status;
  await designation.save();
  res.json(designation);
}));

export default router;
