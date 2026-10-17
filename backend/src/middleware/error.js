import { HttpError } from '../utils/http.js';

export const notFound = (_req, _res, next) => next(new HttpError(404, 'Route not found'));

export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) return res.status(err.status).json({ message: err.message, fields: err.fields });
  if (err?.code === 11000) {
    const key = Object.keys(err.keyPattern || {});
    let message = 'This value already exists';
    let fields;
    if (key.includes('email')) { message = 'A user with this email already exists'; fields = { email: message }; }
    else if (key.includes('branch_name')) { message = 'A branch with this name already exists'; fields = { branch_name: message }; }
    else if (key.includes('department_name')) { message = 'This branch already has a department with this name'; fields = { department_name: message }; }
    else if (key.includes('designation_name')) { message = 'This department already has a designation with this name'; fields = { designation_name: message }; }
    else if (key.includes('branch_admin_user_id')) message = 'This user already administers another branch';
    return res.status(409).json({ message, fields });
  }
  if (err?.name === 'ValidationError') return res.status(400).json({ message: err.message });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON body' });
  console.error(err);
  res.status(500).json({ message: 'Something went wrong on the server' });
}
