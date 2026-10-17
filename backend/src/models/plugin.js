// Shared schema options: snake_case timestamps and a clean JSON output.
export const timestamps = { createdAt: 'created_at', updatedAt: 'updated_at' };

// Case-insensitive uniqueness ("Sales" and "sales" count as the same name) is done with a
// hidden lowercase key field + a normal unique index. This works on every MongoDB version.
export const makeKey = (v) => String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();

// Converts a stored document to API output:
//  - adds the model's own id under its spec name (branch_id, user_id, ...)
//  - never exposes password_hash or __v
export function toJSONWith(ownIdName) {
  return {
    virtuals: false,
    versionKey: false,
    transform(_doc, ret) {
      ret[ownIdName] = String(ret._id);
      ret.id = String(ret._id);
      delete ret._id;
      delete ret.password_hash;
      for (const k of Object.keys(ret)) if (k.endsWith('_key')) delete ret[k];
      for (const [k, v] of Object.entries(ret)) {
        if (v && typeof v === 'object' && v._bsontype === 'ObjectId') ret[k] = String(v);
      }
      return ret;
    },
  };
}
