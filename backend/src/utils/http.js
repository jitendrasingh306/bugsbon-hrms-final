import mongoose from 'mongoose';

export class HttpError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields; // optional { fieldName: "message" }
  }
}

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const isId = (v) =>
  typeof v === 'string' && mongoose.isValidObjectId(v) && String(new mongoose.Types.ObjectId(v)) === v;

export const sameId = (a, b) => a != null && b != null && String(a) === String(b);

// Small rule-based validator. Returns cleaned values or throws a 400 with per-field messages.
//   rules = { name: { required: true, max: 100, label: 'Name' }, email: { type: 'email', required: true } }
// Types: string (default), id, email, phone, pincode, date, number, enum
export function validate(body, rules) {
  const errors = {};
  const out = {};
  for (const [key, rule] of Object.entries(rules)) {
    const label = rule.label || key;
    let v = body?.[key];
    if (typeof v === 'string') v = v.trim();
    const empty = v === undefined || v === null || v === '';

    if (empty) {
      if (rule.required) errors[key] = `${label} is required`;
      else if (v !== undefined) out[key] = null; // explicitly cleared optional field
      continue;
    }

    switch (rule.type || 'string') {
      case 'id':
        if (!isId(String(v))) errors[key] = `${label} is not valid`;
        else out[key] = String(v);
        break;
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || v.length > 150) errors[key] = `${label} must be a valid email`;
        else out[key] = v.toLowerCase();
        break;
      case 'phone':
        if (!/^\+?[0-9]{7,15}$/.test(v)) errors[key] = `${label} must be 7-15 digits (a leading + is allowed)`;
        else out[key] = v;
        break;
      case 'pincode':
        if (!/^[0-9]{4,10}$/.test(v)) errors[key] = `${label} must be 4-10 digits`;
        else out[key] = v;
        break;
      case 'date': {
        const d = new Date(v);
        if (Number.isNaN(d.getTime())) errors[key] = `${label} must be a valid date`;
        else out[key] = d;
        break;
      }
      case 'number': {
        const n = Number(v);
        if (!Number.isFinite(n)) errors[key] = `${label} must be a number`;
        else if (rule.min !== undefined && n < rule.min) errors[key] = `${label} must be at least ${rule.min}`;
        else if (rule.max !== undefined && n > rule.max) errors[key] = `${label} must be at most ${rule.max}`;
        else out[key] = n;
        break;
      }
      case 'enum':
        if (!rule.values.includes(v)) errors[key] = `${label} must be one of: ${rule.values.join(', ')}`;
        else out[key] = v;
        break;
      default:
        if (typeof v !== 'string') errors[key] = `${label} must be text`;
        else if (rule.max && v.length > rule.max) errors[key] = `${label} must be at most ${rule.max} characters`;
        else if (rule.min && v.length < rule.min) errors[key] = `${label} must be at least ${rule.min} characters`;
        else out[key] = v;
    }
  }
  if (Object.keys(errors).length) throw new HttpError(400, 'Please fix the highlighted fields', errors);
  return out;
}

export function validatePassword(pw, field = 'password') {
  if (typeof pw !== 'string' || pw.length < 8 || pw.length > 72 || !/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) {
    throw new HttpError(400, 'Please fix the highlighted fields', {
      [field]: 'Password must be 8-72 characters and include at least one letter and one number',
    });
  }
  return pw;
}
