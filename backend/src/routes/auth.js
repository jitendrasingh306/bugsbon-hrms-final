import { Router } from 'express';
import bcrypt from 'bcryptjs';

import User from '../models/User.js';
import Branch from '../models/Branch.js';
import {
  HttpError,
  asyncHandler,
  validate,
} from '../utils/http.js';
import {
  requireAuth,
  signToken,
} from '../middleware/auth.js';

const router = Router();

// Always compare a bcrypt hash, even if the email isn't found.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password-1', 10);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = validate(req.body, {
      email: {
        type: 'email',
        required: true,
        label: 'Email',
      },
      password: {
        required: true,
        label: 'Password',
        max: 72,
      },
    });

    const user = await User.findOne({ email }).select('+password_hash');

    const passwordMatches = await bcrypt.compare(
      password,
      user?.password_hash || DUMMY_HASH
    );

    if (
      !user ||
      !user.password_hash ||
      !passwordMatches ||
      !user.is_active
    ) {
      throw new HttpError(401, 'Invalid email or password');
    }

    if (
      !['super_admin', 'sub_admin', 'employee'].includes(
        user.system_role
      )
    ) {
      throw new HttpError(403, 'This account has no dashboard access');
    }

    // Super Admin doesn't belong to a branch.
    // Employees and Sub Admins require an active branch.
    if (user.system_role !== 'super_admin') {
      const branch = await Branch.findById(user.branch_id);

      if (!branch || branch.status !== 'active') {
        throw new HttpError(
          403,
          'Your branch is inactive. Contact the Super Admin'
        );
      }
    }

    // Ensure this Sub Admin is still assigned to the branch.
    if (
      user.system_role === 'sub_admin' &&
      !(await Branch.exists({
        _id: user.branch_id,
        branch_admin_user_id: user._id,
        status: 'active',
      }))
    ) {
      throw new HttpError(
        403,
        'You are no longer the Sub Admin of this branch'
      );
    }

    user.last_login_at = new Date();

    await user.save();

    const token = signToken(user);

    // Don't return password_hash to the client.
    user.password_hash = undefined;

    res.json({
      token,
      user,
    });
  })
);

router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: req.user,
  });
});

export default router;