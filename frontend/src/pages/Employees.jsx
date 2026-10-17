import { useRef, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useManage } from '../useManage.js';
import {
  Empty,
  Loading,
  Notice,
  PageHeader,
  SelectField,
  StatusBadge,
  TextField,
  formatDate,
  toDateInput,
} from '../components/ui.jsx';

const emptyForm = {
  branch_id: '',
  department_id: '',
  designation_id: '',
  name: '',
  email: '',
  mobile_no: '',
  joining_date: '',
  monthly_salary: '',
  password: '',
  photo_url: '',
};

export default function Employees() {
  const { isSuper, user } = useAuth();

  const {
    data,
    loadError,
    notice,
    setNotice,
    run,
  } = useManage(async () => {
    const [branches, departments, designations, users] = await Promise.all([
      api.get('/branches'),
      api.get('/departments'),
      api.get('/designations'),
      api.get('/users'),
    ]);

    return {
      branches,
      departments,
      designations,
      users,
    };
  });

  // Sub Admin works only in their own branch.
  const startForm = () => ({
    ...emptyForm,
    branch_id: isSuper ? '' : user.branch_id,
  });

  const [form, setForm] = useState(startForm);
  const [editing, setEditing] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const formRef = useRef(null);

  const reset = () => {
    setForm(startForm());
    setEditing(null);
    setErrors({});
  };

  const name = (list, key, id, label) =>
    list?.find((item) => item[key] === id)?.[label] || '—';

  const isAdminRecord = editing?.system_role === 'sub_admin';

  // Cascading choices: branch -> department -> designation.
  const departments = (data?.departments || []).filter(
    (department) =>
      department.status === 'active' &&
      department.branch_id === form.branch_id
  );

  const designations = (data?.designations || []).filter(
    (designation) =>
      designation.status === 'active' &&
      designation.department_id === form.department_id
  );

  const startEdit = (employee) => {
    setEditing(employee);
    setErrors({});
    setNotice(null);

    setForm({
      branch_id: employee.branch_id || '',
      department_id: employee.department_id || '',
      designation_id: employee.designation_id || '',
      name: employee.name || '',
      email: employee.email || '',
      mobile_no: employee.mobile_no || '',
      joining_date: toDateInput(employee.joining_date),
      monthly_salary: employee.monthly_salary ?? '',
      password: '',
      photo_url: employee.photo_url || '',
    });

    formRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  };

  const submit = async (event) => {
    event.preventDefault();

    setErrors({});

    const body = {
  ...form,
  monthly_salary: String(form.monthly_salary),
};
    // Password is only set during employee creation in this form.
    if (editing) {
      delete body.password;
    }

    // Server should determine the Sub Admin's branch.
    if (!isSuper) {
      delete body.branch_id;
    }

    setSaving(true);

    const ok = await run(
      () =>
        editing
          ? api.put(`/users/${editing.user_id}`, body)
          : api.post('/users', body),
      editing ? 'Employee updated.' : 'Employee added.',
      setErrors
    );

    setSaving(false);

    if (ok) {
      reset();
    }
  };

  const toggle = async (employee) => {
    const next = !employee.is_active;

    if (
      !next &&
      !window.confirm(`Deactivate ${employee.name}?`)
    ) {
      return;
    }

    await run(
      () =>
        api.patch(`/users/${employee.user_id}/status`, {
          is_active: next,
        }),
      next ? 'Employee activated.' : 'Employee deactivated.'
    );
  };

  const set = (key) => (event) => {
    setForm((current) => ({
      ...current,
      [key]: event.target.value,
    }));
  };

  return (
    <>
      <PageHeader
        title="Employees"
        subtitle="Add people and assign each a branch, department and designation."
      />

      <Notice
        notice={notice}
        onClose={() => setNotice(null)}
      />

      <form
        className="card"
        onSubmit={submit}
        ref={formRef}
        noValidate
      >
        <h2>
          {editing ? `Edit ${editing.name}` : 'New employee'}
        </h2>

        {isAdminRecord && (
          <p className="muted">
            This person is a branch Sub Admin. Their email and
            branch are changed from the Branches page.
          </p>
        )}

        <div className="grid">
          {isSuper ? (
            <SelectField
              label="Branch"
              required
              value={form.branch_id}
              error={errors.branch_id}
              disabled={isAdminRecord}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  branch_id: event.target.value,
                  department_id: '',
                  designation_id: '',
                }))
              }
            >
              <option value="">Select a branch</option>

              {data?.branches
                .filter((branch) => branch.status === 'active')
                .map((branch) => (
                  <option
                    key={branch.branch_id}
                    value={branch.branch_id}
                  >
                    {branch.branch_name}
                  </option>
                ))}
            </SelectField>
          ) : (
            <div className="field">
              <label>Branch</label>
              <div className="static">
                {data?.branches?.find(
                  (branch) => branch.branch_id === user.branch_id
                )?.branch_name || '—'}
              </div>
            </div>
          )}

          <SelectField
            label="Department"
            required={!isAdminRecord}
            value={form.department_id}
            error={errors.department_id}
            disabled={!form.branch_id || isAdminRecord}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                department_id: event.target.value,
                designation_id: '',
              }))
            }
          >
            <option value="">
              {form.branch_id
                ? 'Select a department'
                : 'Select a branch first'}
            </option>

            {departments.map((department) => (
              <option
                key={department.department_id}
                value={department.department_id}
              >
                {department.department_name}
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Designation"
            required={!isAdminRecord}
            value={form.designation_id}
            error={errors.designation_id}
            disabled={!form.department_id || isAdminRecord}
            onChange={set('designation_id')}
          >
            <option value="">
              {form.department_id
                ? 'Select a designation'
                : 'Select a department first'}
            </option>

            {designations.map((designation) => (
              <option
                key={designation.designation_id}
                value={designation.designation_id}
              >
                {designation.designation_name}
              </option>
            ))}
          </SelectField>

          <TextField
            label="Name"
            required
            value={form.name}
            onChange={set('name')}
            error={errors.name}
          />

          <TextField
            label="Email"
            type="email"
            required
            value={form.email}
            onChange={set('email')}
            error={errors.email}
            disabled={isAdminRecord}
          />

          <TextField
            label="Mobile number"
            required
            inputMode="tel"
            value={form.mobile_no}
            onChange={set('mobile_no')}
            error={errors.mobile_no}
          />

          <TextField
            label="Joining date"
            type="date"
            value={form.joining_date}
            onChange={set('joining_date')}
            error={errors.joining_date}
          />

          <TextField
            label="Monthly Salary"
            type="number"
            required
            value={form.monthly_salary}
            onChange={set('monthly_salary')}
            error={errors.monthly_salary}
            hint="Salary amount per month"
          />

          {!editing && (
            <TextField
              label="Employee Login Password"
              type="password"
              required
              value={form.password}
              onChange={set('password')}
              error={errors.password}
              hint="Employee will use this password to log in"
            />
          )}

          <TextField
            label="Photo URL"
            type="url"
            value={form.photo_url}
            onChange={set('photo_url')}
            error={errors.photo_url}
            hint="Optional"
          />
        </div>

        <div className="actions">
          <button
            className="btn btn-primary"
            disabled={saving}
          >
            {saving
              ? 'Saving…'
              : editing
                ? 'Save changes'
                : 'Add employee'}
          </button>

          {editing && (
            <button
              type="button"
              className="btn"
              onClick={reset}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <section className="card">
        <h2>Saved employees</h2>

        {loadError ? (
          <Notice
            notice={{
              type: 'error',
              text: loadError,
            }}
          />
        ) : !data ? (
          <Loading />
        ) : data.users.length === 0 ? (
          <Empty>
            No employees yet. Make sure departments and
            designations exist, then add one above.
          </Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  {isSuper && <th>Branch</th>}
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Joined</th>
                  <th>Monthly Salary</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {data.users.map((employee) => (
                  <tr key={employee.user_id}>
                    <td>
                      <strong>{employee.name}</strong>

                      {employee.system_role === 'sub_admin' && (
                        <span className="badge badge-role">
                          Sub Admin
                        </span>
                      )}

                      <br />

                      <span className="muted">
                        {employee.email}
                      </span>
                    </td>

                    {isSuper && (
                      <td>
                        {name(
                          data.branches,
                          'branch_id',
                          employee.branch_id,
                          'branch_name'
                        )}
                      </td>
                    )}

                    <td>
                      {name(
                        data.departments,
                        'department_id',
                        employee.department_id,
                        'department_name'
                      )}
                    </td>

                    <td>
                      {name(
                        data.designations,
                        'designation_id',
                        employee.designation_id,
                        'designation_name'
                      )}
                    </td>

                    <td>{formatDate(employee.joining_date)}</td>

                    <td>
                      {employee.monthly_salary == null
                        ? '—'
                        : Number(employee.monthly_salary).toLocaleString()}
                    </td>

                    <td>
                      <StatusBadge active={employee.is_active} />
                    </td>

                    <td className="row-actions">
                      <button
                        className="btn btn-sm"
                        onClick={() => startEdit(employee)}
                      >
                        Edit
                      </button>

                      {employee.system_role !== 'sub_admin' && (
                        <button
                          className="btn btn-sm"
                          onClick={() => toggle(employee)}
                        >
                          {employee.is_active
                            ? 'Deactivate'
                            : 'Activate'}
                        </button>
                      )}
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