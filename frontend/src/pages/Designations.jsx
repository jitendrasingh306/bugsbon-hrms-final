import { useRef, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useManage } from '../useManage.js';
import { Empty, Loading, Notice, PageHeader, SelectField, StatusBadge, TextField } from '../components/ui.jsx';

const emptyForm = { branch_id: '', department_id: '', designation_name: '', description: '' };

// Designations are job titles (HOD, Developer, Intern...). They are not system access roles.
export default function Designations() {
  const { isSuper } = useAuth();
  const { data, loadError, notice, setNotice, run } = useManage(async () => {
    const [branches, departments, designations] = await Promise.all([api.get('/branches'), api.get('/departments'), api.get('/designations')]);
    return { branches, departments, designations };
  });
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const formRef = useRef(null);

  const reset = () => { setForm(emptyForm); setEditingId(null); setErrors({}); };
  const dept = (id) => data?.departments.find((d) => d.department_id === id);
  const branchName = (id) => data?.branches.find((b) => b.branch_id === id)?.branch_name || '—';

  // Super Admin picks a branch first so only that branch's departments are offered.
  const departmentOptions = (data?.departments || []).filter(
    (d) => d.status === 'active' && (!isSuper || (form.branch_id && d.branch_id === form.branch_id))
  );

  const startEdit = (d) => {
    setEditingId(d.designation_id); setErrors({}); setNotice(null);
    setForm({ branch_id: dept(d.department_id)?.branch_id || '', department_id: d.department_id, designation_name: d.designation_name, description: d.description || '' });
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setSaving(true);
    const body = { department_id: form.department_id, designation_name: form.designation_name, description: form.description };
    const ok = await run(
      () => (editingId ? api.put(`/designations/${editingId}`, body) : api.post('/designations', body)),
      editingId ? 'Designation updated.' : 'Designation created.',
      setErrors
    );
    setSaving(false);
    if (ok) reset();
  };

  const toggle = async (d) => {
    const next = d.status === 'active' ? 'inactive' : 'active';
    if (next === 'inactive' && !window.confirm(`Deactivate ${d.designation_name}?`)) return;
    await run(() => api.patch(`/designations/${d.designation_id}/status`, { status: next }), next === 'inactive' ? 'Designation deactivated.' : 'Designation activated.');
  };

  return (
    <>
      <PageHeader title="Designations" subtitle="Job titles inside a department, such as HOD, Developer or Intern." />
      <Notice notice={notice} onClose={() => setNotice(null)} />

      <form className="card" onSubmit={submit} ref={formRef} noValidate>
        <h2>{editingId ? 'Edit designation' : 'New designation'}</h2>
        <div className="grid">
          {isSuper && (
            <SelectField label="Branch" required value={form.branch_id} disabled={!!editingId}
              onChange={(e) => setForm({ ...form, branch_id: e.target.value, department_id: '' })}>
              <option value="">Select a branch</option>
              {data?.branches.filter((b) => b.status === 'active').map((b) => <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>)}
            </SelectField>
          )}
          {editingId ? (
            <div className="field"><label>Department</label><div className="static">{dept(form.department_id)?.department_name || '—'}</div></div>
          ) : (
            <SelectField label="Department" required value={form.department_id} error={errors.department_id}
              disabled={isSuper && !form.branch_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
              <option value="">{isSuper && !form.branch_id ? 'Select a branch first' : 'Select a department'}</option>
              {departmentOptions.map((d) => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
            </SelectField>
          )}
          <TextField label="Designation name" required value={form.designation_name} error={errors.designation_name}
            onChange={(e) => setForm({ ...form, designation_name: e.target.value })} />
          <TextField label="Description" value={form.description} error={errors.description} hint="Optional"
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="actions">
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Create designation'}</button>
          {editingId && <button type="button" className="btn" onClick={reset}>Cancel</button>}
        </div>
      </form>

      <section className="card">
        <h2>Saved designations</h2>
        {loadError ? <Notice notice={{ type: 'error', text: loadError }} /> : !data ? <Loading /> : data.designations.length === 0 ? (
          <Empty>No designations yet. {data.departments.length === 0 ? 'Create a department first.' : 'Pick a department above and add one.'}</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Designation</th><th>Department</th>{isSuper && <th>Branch</th>}<th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {data.designations.map((d) => (
                  <tr key={d.designation_id}>
                    <td><strong>{d.designation_name}</strong>{d.description && <><br /><span className="muted">{d.description}</span></>}</td>
                    <td>{dept(d.department_id)?.department_name || '—'}</td>
                    {isSuper && <td>{branchName(dept(d.department_id)?.branch_id)}</td>}
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
