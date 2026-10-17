import { Router } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import User from '../models/User.js';
import {
  HttpError,
  asyncHandler,
  isId,
  sameId,
  validate,
} from '../utils/http.js';
import {
  assertInScope,
  branchForWrite,
  isSuper,
  resolveOrgLinks,
  scopedBranchId,
} from '../utils/access.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

const rules = {
  name: { required: true, max: 100, label: 'Name' },
  email: { type: 'email', required: true, label: 'Email' },
  mobile_no: { type: 'phone', required: true, label: 'Mobile number' },

  photo_url: { max: 500, label: 'Photo URL' },
  joining_date: { type: 'date', label: 'Joining date' },
  leaving_date: { type: 'date', label: 'Leaving date' },

 monthly_salary: {
  type: 'text',
  required: true,
  label: 'Monthly salary',
},

  // Password is required on creation; PUT does not change it.
  password: {
    max: 72,
    label: 'Password',
  },

  previous_experience_years: {
    label: 'Previous experience years',
  },
  previous_company: { max: 150, label: 'Previous company' },
  previous_company_leaving_date: {
    type: 'date',
    label: 'Previous company leaving date',
  },
  previous_leaving_reason: {
    max: 1000,
    label: 'Previous company leaving reason',
  },
  experience_letter_url: {
    max: 500,
    label: 'Experience letter URL',
  },

  branch_id: { type: 'id', label: 'Branch' },
  department_id: { type: 'id', label: 'Department' },
  designation_id: { type: 'id', label: 'Designation' },
};

function checkSalaryAndPassword(data, { requirePassword = false } = {}) {
  const salaryText = data.monthly_salary;

  if (
    typeof salaryText !== 'string' ||
    salaryText.trim() === '' ||
    !Number.isFinite(Number(salaryText)) ||
    Number(salaryText) < 0
  ) {
    throw new HttpError(400, 'Please fix the highlighted fields', {
      monthly_salary: 'Enter a valid non-negative monthly salary',
    });
  }

  if (requirePassword) {
    if (typeof data.password !== 'string' || !data.password.trim()) {
      throw new HttpError(400, 'Please fix the highlighted fields', {
        password: 'Password is required for a new employee',
      });
    }

    if (data.password.length < 8) {
      throw new HttpError(400, 'Please fix the highlighted fields', {
        password: 'Password must be at least 8 characters long',
      });
    }

    if (Buffer.byteLength(data.password, 'utf8') > 72) {
      throw new HttpError(400, 'Please fix the highlighted fields', {
        password: 'Password must not exceed 72 bytes',
      });
    }
  }
}

function checkDates(data) {
  if (
    data.joining_date &&
    data.leaving_date &&
    new Date(data.leaving_date) < new Date(data.joining_date)
  ) {
    throw new HttpError(400, 'Please fix the highlighted fields', {
      leaving_date: 'Leaving date cannot be before the joining date',
    });
  }

  if (
    data.joining_date &&
    data.previous_company_leaving_date &&
    new Date(data.previous_company_leaving_date) >
      new Date(data.joining_date)
  ) {
    throw new HttpError(400, 'Please fix the highlighted fields', {
      previous_company_leaving_date:
        'Previous company leaving date cannot be after the current joining date',
    });
  }

  for (const field of ['photo_url', 'experience_letter_url']) {
    if (data[field] && !/^https?:\/\//i.test(data[field])) {
      throw new HttpError(400, 'Please fix the highlighted fields', {
        [field]: 'URL must start with http:// or https://',
      });
    }
  }

  if (
    data.previous_experience_years !== undefined &&
    data.previous_experience_years !== '' &&
    (!Number.isFinite(Number(data.previous_experience_years)) ||
      Number(data.previous_experience_years) < 0)
  ) {
    throw new HttpError(400, 'Please fix the highlighted fields', {
      previous_experience_years:
        'Experience years must be a valid non-negative number',
    });
  }
}

function experienceFields(data) {
  const years = data.previous_experience_years;

  return {
    previous_experience_years:
      years === undefined || years === ''
        ? undefined
        : Number(years),
    previous_company: data.previous_company || undefined,
    previous_company_leaving_date:
      data.previous_company_leaving_date || undefined,
    previous_leaving_reason: data.previous_leaving_reason || undefined,
    experience_letter_url: data.experience_letter_url || undefined,
  };
}

async function findInScope(req) {
  const user = mongoose.isValidObjectId(req.params.id)
    ? await User.findById(req.params.id)
    : null;

  if (!user || user.system_role === 'super_admin') {
    throw new HttpError(404, 'Employee not found');
  }

  assertInScope(req, user.branch_id);

  return user;
}

// Get users visible to this admin.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = {
      system_role: { $ne: 'super_admin' },
    };

    const scope = scopedBranchId(req);

    if (scope) {
      filter.branch_id = scope;
    } else if (isId(req.query.branch_id)) {
      filter.branch_id = req.query.branch_id;
    }

    if (isId(req.query.department_id)) {
      filter.department_id = req.query.department_id;
    }

    if (isId(req.query.designation_id)) {
      filter.designation_id = req.query.designation_id;
    }

    if (['true', 'false'].includes(req.query.is_active)) {
      filter.is_active = req.query.is_active === 'true';
    }

    res.json(await User.find(filter).sort({ name: 1 }));
  })
);

// Create employee.
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = validate(req.body, rules);

    checkSalaryAndPassword(data, { requirePassword: true });
    checkDates(data);

    const branchId = branchForWrite(
      req,
      isSuper(req) ? data.branch_id : null
    );

    await resolveOrgLinks(
      {
        branch_id: branchId,
        department_id: data.department_id,
        designation_id: data.designation_id,
      },
      {
        requireDepartment: true,
        requireDesignation: true,
      }
    );

    const passwordHash = await bcrypt.hash(data.password, 12);

    const employee = await User.create({
      name: data.name,
      email: data.email,
      mobile_no: data.mobile_no,
      password_hash: passwordHash,

      photo_url: data.photo_url || undefined,
      joining_date: data.joining_date || undefined,
      leaving_date: data.leaving_date || undefined,
      monthly_salary: Number(data.monthly_salary),

      ...experienceFields(data),

      system_role: 'employee',
      branch_id: branchId,
      department_id: data.department_id,
      designation_id: data.designation_id,
      created_by: req.user._id,
    });

    // Ensure password hash is not included in this response.
    employee.password_hash = undefined;

    res.status(201).json(employee);
  })
);

// Update employee details. Password is intentionally not changed here.
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const employee = await findInScope(req);
    const data = validate(req.body, rules);

    checkSalaryAndPassword(data);
    checkDates(data);

    const isAdminRecord = employee.system_role === 'sub_admin';

    const branchId = isAdminRecord
      ? employee.branch_id
      : branchForWrite(req, isSuper(req) ? data.branch_id : null);

    const email = isAdminRecord ? employee.email : data.email;

    await resolveOrgLinks(
      {
        branch_id: branchId,
        department_id: data.department_id,
        designation_id: data.designation_id,
      },
      {
        requireDepartment: !isAdminRecord,
        requireDesignation: !isAdminRecord,
      }
    );

    employee.set({
      name: data.name,
      email,
      mobile_no: data.mobile_no,
      photo_url: data.photo_url || undefined,
      joining_date: data.joining_date || undefined,
      leaving_date: data.leaving_date || undefined,
      monthly_salary: Number(data.monthly_salary),

      ...experienceFields(data),

      branch_id: branchId,
      department_id: data.department_id || undefined,
      designation_id: data.designation_id || undefined,
    });

    await employee.save();

    res.json(employee);
  })
);

// Activate/deactivate employee.
router.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    if (typeof req.body?.is_active !== 'boolean') {
      throw new HttpError(400, 'is_active must be true or false');
    }

    const employee = await findInScope(req);

    if (sameId(employee._id, req.user._id)) {
      throw new HttpError(409, 'You cannot deactivate your own account');
    }

    if (employee.system_role === 'sub_admin') {
      throw new HttpError(
        409,
        'A branch Sub Admin is managed from the Branches page (Super Admin only)'
      );
    }

    if (req.body.is_active) {
      await resolveOrgLinks(
        {
          branch_id: employee.branch_id,
          department_id: employee.department_id,
          designation_id: employee.designation_id,
        },
        {
          requireDepartment: true,
          requireDesignation: true,
        }
      );
    }

    employee.is_active = req.body.is_active;

    await employee.save();

    res.json(employee);
  })
);

export default router;