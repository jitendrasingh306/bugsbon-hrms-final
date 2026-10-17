import { Router } from 'express';
import mongoose from 'mongoose';
import Department from '../models/Department.js';
import Designation from '../models/Designation.js';
import User from '../models/User.js';
import { HttpError, asyncHandler, isId, validate } from '../utils/http.js';
import { assertInScope, branchForWrite, isSuper, loadBranch, scopedBranchId } from '../utils/access.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const rules = {
  department_name: { required: true, max: 100, label: 'Department name' },
  description: { max: 500, label: 'Description' },
};

async function findInScope(req) {
  const dept = mongoose.isValidObjectId(req.params.id) ? await Department.findById(req.params.id) : null;
  if (!dept) throw new HttpError(404, 'Department not found');
  assertInScope(req, dept.branch_id);
  return dept;
}

router.get('/', asyncHandler(async (req, res) => {
  const filter = {};
  const scope = scopedBranchId(req);
  if (scope) filter.branch_id = scope;
  else if (isId(req.query.branch_id)) filter.branch_id = req.query.branch_id;
  if (['active', 'inactive'].includes(req.query.status)) filter.status = req.query.status;
  res.json(await Department.find(filter).sort({ department_key: 1 }));
}));

router.post('/', asyncHandler(async (req, res) => {
  const data = validate(req.body, { ...rules, branch_id: { type: 'id', label: 'Branch' } });
  // Sub Admin: branch comes from the logged-in account, whatever the client sent.
  const branchId = branchForWrite(req, isSuper(req) ? data.branch_id : null);
  await loadBranch(branchId);
  const dept = await Department.create({
    department_name: data.department_name,
    description: data.description ?? undefined,
    branch_id: branchId,
  });
  res.status(201).json(dept);
}));

// The branch of a department can't change (its designations and employees belong to it).
router.put('/:id', asyncHandler(async (req, res) => {
  const dept = await findInScope(req);
  const data = validate(req.body, rules);
  dept.department_name = data.department_name;
  dept.description = data.description ?? undefined;
  await dept.save();
  res.json(dept);
}));

router.patch('/:id/status', asyncHandler(async (req, res) => {
  const { status } = validate(req.body, { status: { type: 'enum', values: ['active', 'inactive'], required: true, label: 'Status' } });
  const dept = await findInScope(req);
  if (status === 'inactive') {
    const [desigs, people] = await Promise.all([
      Designation.countDocuments({ department_id: dept._id, status: 'active' }),
      User.countDocuments({ department_id: dept._id, is_active: true }),
    ]);
    if (desigs || people) {
      throw new HttpError(409, `Cannot deactivate: ${desigs} active designation(s) and ${people} active employee(s) still use this department. Deactivate or move them first.`);
    }
  } else {
    await loadBranch(dept.branch_id); // can't reactivate inside an inactive branch
  }
  dept.status = status;
  await dept.save();
  res.json(dept);
}));

export default router;
