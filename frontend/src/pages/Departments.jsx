import { useRef, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useManage } from '../useManage.js';
import { Empty, Loading, Notice, PageHeader, SelectField, StatusBadge, TextField } from '../components/ui.jsx';

const emptyForm = { branch_id: '', department_name: '', description: '' };

export default function Departments() {
  const { isSuper } = useAuth();
  const { data, loadError, notice, setNotice, run } = useManage(async () => {
    const [branches, departments] = await Promise.all([api.get('/branches'), api.get('/departments')]);
    return { branches, departments };
  });
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const formRef = useRef(null);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const reset = () => { setForm(emptyForm); setEditingId(null); setErrors({}); };
  const branchName = (id) => data?.branches.find((b) => b.branch_id === id)?.branch_name || '—';
  const activeBranches = data?.branches.filter((b) => b.status === 'active') || [];

  const startEdit = (d) => {
    setEditingId(d.department_id); setErrors({}); setNotice(null);
    setForm({ branch_id: d.branch_id, department_name: d.department_name, description: d.description || '' });
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setSaving(true);
    // Sub Admins don't send a branch: the server uses their own account's branch.
    const body = { department_name: form.department_name, description: form.description, ...(isSuper ? { branch_id: form.branch_id } : {}) };
    const ok = await run(
      () => (editingId ? api.put(`/departments/${editingId}`, body) : api.post('/departments', body)),
      editingId ? 'Department updated.' : 'Department created.',
      setErrors
    );
    setSaving(false);
    if (ok) reset();
  };

  const toggle = async (d) => {
    const next = d.status === 'active' ? 'inactive' : 'active';
    if (next === 'inactive' && !window.confirm(`Deactivate ${d.department_name}?`)) return;
    await run(() => api.patch(`/departments/${d.department_id}/status`, { status: next }), next === 'inactive' ? 'Department deactivated.' : 'Department activated.');
  };

  return (
    <>
      <PageHeader title="Departments" subtitle="Teams inside a branch, such as Development, Testing, Sales or HR." />
      <Notice notice={notice} onClose={() => setNotice(null)} />

      <form className="card" onSubmit={submit} ref={formRef} noValidate>
        <h2>{editingId ? 'Edit department' : 'New department'}</h2>
        <div className="grid">
          {isSuper ? (
            <SelectField label="Branch" required value={form.branch_id} onChange={set('branch_id')} disabled={!!editingId} error={errors.branch_id}>
              <option value="">Select a branch</option>
              {activeBranches.map((b) => <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>)}
            </SelectField>
          ) : (
            <div className="field"><label>Branch</label><div className="static">{data?.branches[0]?.branch_name || '—'}</div></div>
          )}
          <TextField label="Department name" required value={form.department_name} onChange={set('department_name')} error={errors.department_name} />
          <TextField className="span-2" label="Description" value={form.description} onChange={set('description')} error={errors.description} hint="Optional" />
        </div>
        <div className="actions">
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Create department'}</button>
          {editingId && <button type="button" className="btn" onClick={reset}>Cancel</button>}
        </div>
      </form>

      <section className="card">
        <h2>Saved departments</h2>
        {loadError ? <Notice notice={{ type: 'error', text: loadError }} /> : !data ? <Loading /> : data.departments.length === 0 ? (
          <Empty>No departments yet. Create one above, then add designations to it.</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Department</th>{isSuper && <th>Branch</th>}<th>Description</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {data.departments.map((d) => (
                  <tr key={d.department_id}>
                    <td><strong>{d.department_name}</strong></td>
                    {isSuper && <td>{branchName(d.branch_id)}</td>}
                    <td>{d.description || '—'}</td>
                    <td><StatusBadge active={d.status === 'active'} /></td>
                    <td className="row-actions">
                      <button className="btn btn-sm" onClick={() => startEdit(d)}>Edit</button>
                      <button className="btn btn-sm" onClick={() => toggle(d)}>{d.status === 'active' ? 'Deactivate' : 'Activate'}</button>
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
