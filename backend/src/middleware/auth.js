import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import User from '../models/User.js';
import Branch from '../models/Branch.js';
import {
  HttpError,
  asyncHandler,
  sameId,
} from '../utils/http.js';

export const signToken = (user) =>
  jwt.sign(
    {
      sub: String(user._id),
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn,
    }
  );

// Verify token and fetch the current user from the database.
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';

  const token = header.startsWith('Bearer ')
    ? header.slice(7)
    : null;

  if (!token) {
    throw new HttpError(401, 'Please log in');
  }

  let payload;

  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new HttpError(
      401,
      'Your session has expired. Please log in again'
    );
  }

  const user = await User.findById(payload.sub);

  if (!user || !user.is_active) {
    throw new HttpError(401, 'This account is not active');
  }

  if (
    !['super_admin', 'sub_admin', 'employee'].includes(
      user.system_role
    )
  ) {
    throw new HttpError(403, 'This account has no dashboard access');
  }

  // Every non-Super-Admin account needs an active branch.
  if (user.system_role !== 'super_admin') {
    const branch = await Branch.findById(user.branch_id);

    if (!branch || branch.status !== 'active') {
      throw new HttpError(
        403,
        'Your branch is inactive. Contact the Super Admin'
      );
    }
  }

  // Confirm the Sub Admin is still assigned to this branch.
  if (user.system_role === 'sub_admin') {
    const branch = await Branch.findById(user.branch_id);

    if (
      !branch ||
      branch.status !== 'active' ||
      !sameId(branch.branch_admin_user_id, user._id)
    ) {
      throw new HttpError(
        403,
        'Your branch is inactive or you are no longer its Sub Admin'
      );
    }
  }

  req.user = user;

  next();
});

// Use this on admin-only backend routes.
export const requireRole = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user.system_role)) {
    return next(
      new HttpError(403, 'You do not have access to this action')
    );
  }

  next();
};