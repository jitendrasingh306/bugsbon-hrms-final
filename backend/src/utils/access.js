import Branch from '../models/Branch.js';
import Department from '../models/Department.js';
import Designation from '../models/Designation.js';
import { HttpError, sameId } from './http.js';

export const isSuper = (req) => req.user.system_role === 'super_admin';

// The branch a request is limited to. Sub Admins: ALWAYS their own account's branch
// (never anything the client sent). Super Admin: null = all branches.
export const scopedBranchId = (req) => (isSuper(req) ? null : req.user.branch_id);

// Throws 404 (not 403, so we don't reveal that the record exists) when a Sub Admin
// touches a record outside their branch.
export function assertInScope(req, recordBranchId) {
  if (!isSuper(req) && !sameId(recordBranchId, req.user.branch_id)) {
    throw new HttpError(404, 'Record not found');
  }
}

// Branch to use when creating a record: Sub Admin -> own branch; Super Admin -> must send one.
export function branchForWrite(req, bodyBranchId) {
  if (!isSuper(req)) return req.user.branch_id;
  if (!bodyBranchId) throw new HttpError(400, 'Please fix the highlighted fields', { branch_id: 'Branch is required' });
  return bodyBranchId;
}

export async function loadBranch(id, { mustBeActive = true } = {}) {
  const branch = await Branch.findById(id);
  if (!branch) throw new HttpError(400, 'Please fix the highlighted fields', { branch_id: 'Branch not found' });
  if (mustBeActive && branch.status !== 'active') {
    throw new HttpError(400, 'Please fix the highlighted fields', { branch_id: 'Branch is inactive' });
  }
  return branch;
}

// Checks that branch -> department -> designation really belong together.
// Returns the loaded documents.
export async function resolveOrgLinks({ branch_id, department_id, designation_id }, { requireDepartment, requireDesignation }) {
  const fail = (field, msg) => { throw new HttpError(400, 'Please fix the highlighted fields', { [field]: msg }); };

  const branch = await loadBranch(branch_id);
  let department = null;
  let designation = null;

  if (!department_id) {
    if (requireDepartment) fail('department_id', 'Department is required');
    if (designation_id) fail('department_id', 'Select a department before choosing a designation');
  } else {
    department = await Department.findById(department_id);
    if (!department) fail('department_id', 'Department not found');
    if (!sameId(department.branch_id, branch._id)) fail('department_id', 'This department does not belong to the selected branch');
    if (department.status !== 'active') fail('department_id', 'Department is inactive');
  }

  if (!designation_id) {
    if (requireDesignation) fail('designation_id', 'Designation is required');
  } else {
    designation = await Designation.findById(designation_id);
    if (!designation) fail('designation_id', 'Designation not found');
    if (!sameId(designation.department_id, department?._id)) fail('designation_id', 'This designation does not belong to the selected department');
    if (designation.status !== 'active') fail('designation_id', 'Designation is inactive');
  }
  return { branch, department, designation };
}
