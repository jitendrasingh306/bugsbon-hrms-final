import { Router } from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import Branch from '../models/Branch.js';
import User from '../models/User.js';
import { HttpError, asyncHandler, validate, validatePassword } from '../utils/http.js';
import { assertInScope, scopedBranchId } from '../utils/access.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const branchRules = {
  branch_name: { required: true, max: 100, label: 'Branch name' },
  address: { required: true, max: 300, label: 'Address' },
  city: { required: true, max: 80, label: 'City' },
  state: { required: true, max: 80, label: 'State' },
  pincode: { type: 'pincode', required: true, label: 'Pincode' },
  mobile_no: { type: 'phone', required: true, label: 'Branch mobile number' },
  latitude: { type: 'number', min: -90, max: 90, label: 'Latitude' },
  longitude: { type: 'number', min: -180, max: 180, label: 'Longitude' },
};
const adminRules = {
  name: { required: true, max: 100, label: 'Sub Admin name' },
  email: { type: 'email', required: true, label: 'Sub Admin email' },
  mobile_no: { type: 'phone', required: true, label: 'Sub Admin mobile number' },
  joining_date: { type: 'date', label: 'Joining date' },
};

// Runs several validators and reports all field errors together.
function validateAll(parts) {
  const fields = {};
  const out = [];
  for (const run of parts) {
    try { out.push(run()); } catch (e) {
      if (!(e instanceof HttpError)) throw e;
      Object.assign(fields, e.fields);
      out.push(null);
    }
  }
  if (Object.keys(fields).length) throw new HttpError(400, 'Please fix the highlighted fields', fields);
  return out;
}
const prefixed = (fn) => () => {
  try { return fn(); } catch (e) {
    if (e instanceof HttpError && e.fields) {
      e.fields = Object.fromEntries(Object.entries(e.fields).map(([k, v]) => [`sub_admin.${k}`, v]));
    }
    throw e;
  }
};

async function withAdmins(branches) {
  const ids = branches.map((b) => b.branch_admin_user_id);
  const admins = await User.find({ _id: { $in: ids } });
  const byId = new Map(admins.map((a) => [String(a._id), a]));
  return branches.map((b) => {
    const a = byId.get(String(b.branch_admin_user_id));
    return {
      ...b.toJSON(),
      branch_admin: a ? { user_id: String(a._id), name: a.name, email: a.email, mobile_no: a.mobile_no, joining_date: a.joining_date, is_active: a.is_active } : null,
    };
  });
}

// List: Super Admin sees all branches; Sub Admin sees only their own.
router.get('/', asyncHandler(async (req, res) => {
  const filter = {};
  const scope = scopedBranchId(req);
  if (scope) filter._id = scope;
  if (['active', 'inactive'].includes(req.query.status)) filter.status = req.query.status;
  const branches = await Branch.find(filter).sort({ branch_key: 1 });
  res.json(await withAdmins(branches));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const branch = mongoose.isValidObjectId(req.params.id) ? await Branch.findById(req.params.id) : null;
  if (!branch) throw new HttpError(404, 'Branch not found');
  assertInScope(req, branch._id);
  res.json((await withAdmins([branch]))[0]);
}));

// ---- Super Admin only below ----

// Create a branch together with its Sub Admin login (one request).
router.post('/', requireRole('super_admin'), asyncHandler(async (req, res) => {
  const [b, a] = validateAll([
    () => validate(req.body, branchRules),
    prefixed(() => validate(req.body.sub_admin || {}, adminRules)),
  ]);
  const password = (() => {
    try { return validatePassword(req.body.sub_admin?.password); } catch (e) {
      throw new HttpError(400, e.message, { 'sub_admin.password': e.fields.password });
    }
  })();

  // Pre-generate ids so the user and branch can point at each other.
  const branchId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();

  // The Sub Admin is an employee too: same User record, linked to this branch.
  await User.create({
    _id: userId,
    ...a,
    password_hash: await bcrypt.hash(password, 12),
    system_role: 'sub_admin',
    branch_id: branchId,
    created_by: req.user._id,
  });
  try {
    const branch = await Branch.create({ _id: branchId, ...b, branch_admin_user_id: userId });
    res.status(201).json((await withAdmins([branch]))[0]);
  } catch (err) {
    await User.deleteOne({ _id: userId }); // no orphan Sub Admin if the branch fails
    throw err;
  }
}));

router.put('/:id', requireRole('super_admin'), asyncHandler(async (req, res) => {
  const branch = mongoose.isValidObjectId(req.params.id) ? await Branch.findById(req.params.id) : null;
  if (!branch) throw new HttpError(404, 'Branch not found');

  const hasAdmin = req.body.sub_admin && typeof req.body.sub_admin === 'object';
  const [b, a] = validateAll([
    () => validate(req.body, branchRules),
    prefixed(() => (hasAdmin ? validate(req.body.sub_admin, adminRules) : null)),
  ]);
  let newHash;
  if (hasAdmin && req.body.sub_admin.password) {
    try { newHash = await bcrypt.hash(validatePassword(req.body.sub_admin.password), 12); } catch (e) {
      if (e.fields) throw new HttpError(400, e.message, { 'sub_admin.password': e.fields.password });
      throw e;
    }
  }

  // Optional coordinates: an empty value clears them.
  const { latitude, longitude, ...rest } = b;
  branch.set(rest);
  branch.latitude = latitude ?? undefined;
  branch.longitude = longitude ?? undefined;
  await branch.save();

  if (a) {
    const admin = await User.findById(branch.branch_admin_user_id);
    if (!admin) throw new HttpError(500, 'Branch Sub Admin record is missing');
    admin.set(a);
    if (newHash) admin.password_hash = newHash;
    await admin.save();
  }
  res.json((await withAdmins([branch]))[0]);
}));

// Deactivate / reactivate. An inactive branch blocks its Sub Admin's login and new records.
router.patch('/:id/status', requireRole('super_admin'), asyncHandler(async (req, res) => {
  const { status } = validate(req.body, { status: { type: 'enum', values: ['active', 'inactive'], required: true, label: 'Status' } });
  const branch = mongoose.isValidObjectId(req.params.id) ? await Branch.findById(req.params.id) : null;
  if (!branch) throw new HttpError(404, 'Branch not found');
  branch.status = status;
  await branch.save();
  res.json((await withAdmins([branch]))[0]);
}));

export default router;
