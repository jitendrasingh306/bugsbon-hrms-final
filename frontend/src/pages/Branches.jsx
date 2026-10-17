import { useRef, useState } from 'react';
import { api } from '../api.js';
import { useManage } from '../useManage.js';
import { Empty, Loading, Notice, PageHeader, StatusBadge, TextField, toDateInput } from '../components/ui.jsx';

const emptyForm = {
  branch_name: '', address: '', city: '', state: '', pincode: '', mobile_no: '', latitude: '', longitude: '',
  sub_admin: { name: '', email: '', mobile_no: '', joining_date: '', password: '' },
};

export default function Branches() {
  const { data: branches, loadError, notice, setNotice, run } = useManage(() => api.get('/branches'));
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const formRef = useRef(null);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setAdmin = (k) => (e) => setForm({ ...form, sub_admin: { ...form.sub_admin, [k]: e.target.value } });
  const reset = () => { setForm(emptyForm); setEditingId(null); setErrors({}); };

  const startEdit = (b) => {
    setEditingId(b.branch_id); setErrors({}); setNotice(null);
    setForm({
      branch_name: b.branch_name, address: b.address, city: b.city, state: b.state, pincode: b.pincode, mobile_no: b.mobile_no,
      latitude: b.latitude ?? '', longitude: b.longitude ?? '',
      sub_admin: { name: b.branch_admin?.name || '', email: b.branch_admin?.email || '', mobile_no: b.branch_admin?.mobile_no || '', joining_date: toDateInput(b.branch_admin?.joining_date), password: '' },
    });
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const ok = await run(
      () => (editingId ? api.put(`/branches/${editingId}`, form) : api.post('/branches', form)),
      editingId ? 'Branch updated.' : 'Branch and Sub Admin created.',
      setErrors
    );
    setSaving(false);
    if (ok) reset();
  };

  const toggle = async (b) => {
    const next = b.status === 'active' ? 'inactive' : 'active';
    if (next === 'inactive' && !window.confirm(`Deactivate ${b.branch_name}? Its Sub Admin will not be able to log in.`)) return;
    await run(() => api.patch(`/branches/${b.branch_id}/status`, { status: next }), next === 'inactive' ? 'Branch deactivated.' : 'Branch activated.');
  };

  const e = (k) => errors[k];
  return (
    <>
      <PageHeader title="Branches" subtitle="Create a branch together with the Sub Admin who will manage it." />
      <Notice notice={notice} onClose={() => setNotice(null)} />

      <form className="card" onSubmit={submit} ref={formRef} noValidate>
        <h2>{editingId ? 'Edit branch' : 'New branch'}</h2>
        <div className="grid">
          <TextField label="Branch name" required value={form.branch_name} onChange={set('branch_name')} error={e('branch_name')} />
          <TextField label="Branch mobile number" required inputMode="tel" value={form.mobile_no} onChange={set('mobile_no')} error={e('mobile_no')} />
          <TextField className="span-2" label="Address" required value={form.address} onChange={set('address')} error={e('address')} />
          <TextField label="City" required value={form.city} onChange={set('city')} error={e('city')} />
          <TextField label="State" required value={form.state} onChange={set('state')} error={e('state')} />
          <TextField label="Pincode" required inputMode="numeric" value={form.pincode} onChange={set('pincode')} error={e('pincode')} />
          <TextField label="Latitude" type="number" step="any" value={form.latitude} onChange={set('latitude')} error={e('latitude')} hint="Optional" />
          <TextField label="Longitude" type="number" step="any" value={form.longitude} onChange={set('longitude')} error={e('longitude')} hint="Optional" />
        </div>

        <h3>Branch Sub Admin</h3>
        <p className="muted">{editingId ? 'Update the Sub Admin’s details. Leave the password blank to keep it.' : 'This person logs in to manage only this branch.'}</p>
        <div className="grid">
          <TextField label="Name" required value={form.sub_admin.name} onChange={setAdmin('name')} error={e('sub_admin.name')} />
          <TextField label="Email (login)" type="email" required autoComplete="off" value={form.sub_admin.email} onChange={setAdmin('email')} error={e('sub_admin.email')} />
          <TextField label="Mobile number" required inputMode="tel" value={form.sub_admin.mobile_no} onChange={setAdmin('mobile_no')} error={e('sub_admin.mobile_no')} />
          <TextField label="Joining date" type="date" value={form.sub_admin.joining_date} onChange={setAdmin('joining_date')} error={e('sub_admin.joining_date')} />
          <TextField label={editingId ? 'New password' : 'Password'} type="password" required={!editingId} autoComplete="new-password"
            value={form.sub_admin.password} onChange={setAdmin('password')} error={e('sub_admin.password')} hint="At least 8 characters, with a letter and a number" />
        </div>

        <div className="actions">
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Create branch'}</button>
          {editingId && <button type="button" className="btn" onClick={reset}>Cancel</button>}
        </div>
      </form>

      <section className="card">
        <h2>All branches</h2>
        {loadError ? <Notice notice={{ type: 'error', text: loadError }} /> : !branches ? <Loading /> : branches.length === 0 ? (
          <Empty>No branches yet. Use the form above to create the first one.</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Branch</th><th>Location</th><th>Sub Admin</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {branches.map((b) => (
                  <tr key={b.branch_id}>
                    <td><strong>{b.branch_name}</strong><br /><span className="muted">{b.mobile_no}</span></td>
                    <td>{b.city}, {b.state} {b.pincode}</td>
                    <td>{b.branch_admin ? <>{b.branch_admin.name}<br /><span className="muted">{b.branch_admin.email}</span></> : '—'}</td>
                    <td><StatusBadge active={b.status === 'active'} /></td>
                    <td className="row-actions">
                      <button className="btn btn-sm" onClick={() => startEdit(b)}>Edit</button>
                      <button className="btn btn-sm" onClick={() => toggle(b)}>{b.status === 'active' ? 'Deactivate' : 'Activate'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
