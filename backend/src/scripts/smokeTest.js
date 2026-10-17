// End-to-end API check. Needs the API running and a seeded Super Admin.
//   $env:SMOKE_EMAIL="..."; $env:SMOKE_PASSWORD="..."; npm run test:smoke
// It creates a few clearly named "Smoke ..." records (branches, etc.) in your database.
const BASE = process.env.API_URL || 'http://localhost:5000/api';
const run = Date.now().toString(36);
let passed = 0, failed = 0;

async function call(method, path, body, token) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null; try { data = await res.json(); } catch { /* no body */ }
  return { status: res.status, data };
}
function check(name, cond, extra) {
  if (cond) { passed++; console.log(`  PASS  ${name}`); } else { failed++; console.log(`  FAIL  ${name}`, extra ?? ''); }
}

const branchBody = (n, adminEmail) => ({
  branch_name: `Smoke ${n} ${run}`, address: '1 Test Road', city: 'Gwalior', state: 'Madhya Pradesh', pincode: '474001', mobile_no: '9876543210',
  sub_admin: { name: `Admin ${n}`, email: adminEmail, mobile_no: '9876500000', password: 'Passw0rdOK' },
});

const sa = await call('POST', '/auth/login', { email: process.env.SMOKE_EMAIL, password: process.env.SMOKE_PASSWORD });
check('Super Admin can log in', sa.status === 200 && sa.data.token, sa.data);
const S = sa.data.token;
check('Wrong password is rejected', (await call('POST', '/auth/login', { email: process.env.SMOKE_EMAIL, password: 'wrong-pass-1' })).status === 401);
check('No token -> 401', (await call('GET', '/branches')).status === 401);

console.log('Branch + Sub Admin creation');
const A = await call('POST', '/branches', branchBody('A', `a.${run}@smoke.test`), S);
check('Branch A created with its Sub Admin', A.status === 201 && A.data.branch_admin?.email === `a.${run}@smoke.test`, A.data);
const B = await call('POST', '/branches', branchBody('B', `b.${run}@smoke.test`), S);
check('Branch B created', B.status === 201, B.data);
const dupName = await call('POST', '/branches', { ...branchBody('A', `c.${run}@smoke.test`), branch_name: `smoke a ${run}` }, S);
check('Duplicate branch name (different case) -> 409', dupName.status === 409, dupName.data);
const orphanCheck = await call('POST', '/branches', branchBody('X', `a.${run}@smoke.test`), S);
check('Duplicate Sub Admin email -> 409', orphanCheck.status === 409, orphanCheck.data);
const weak = await call('POST', '/branches', { ...branchBody('W', `w.${run}@smoke.test`), sub_admin: { ...branchBody('W', 'w@smoke.test').sub_admin, password: 'short' } }, S);
check('Weak Sub Admin password -> 400 with field error', weak.status === 400 && weak.data.fields?.['sub_admin.password'], weak.data);

const la = await call('POST', '/auth/login', { email: `a.${run}@smoke.test`, password: 'Passw0rdOK' });
const lb = await call('POST', '/auth/login', { email: `b.${run}@smoke.test`, password: 'Passw0rdOK' });
check('Sub Admin A and B can log in', la.status === 200 && lb.status === 200, [la.data, lb.data]);
check('Login response never includes password_hash', !JSON.stringify(la.data).includes('password_hash'));
const TA = la.data.token, TB = lb.data.token;
const branchA = A.data.branch_id, branchB = B.data.branch_id;
check('Sub Admin user is linked to branch', la.data.user.branch_id === branchA && la.data.user.system_role === 'sub_admin', la.data.user);

console.log('Access control');
check('Sub Admin cannot create branches', (await call('POST', '/branches', branchBody('Z', `z.${run}@smoke.test`), TA)).status === 403);
check('Sub Admin cannot edit/deactivate branches', (await call('PATCH', `/branches/${branchA}/status`, { status: 'inactive' }, TA)).status === 403);
const listA = await call('GET', '/branches', null, TA);
check('Sub Admin sees only own branch', listA.data.length === 1 && listA.data[0].branch_id === branchA, listA.data);
check('Sub Admin cannot read other branch by id', (await call('GET', `/branches/${branchB}`, null, TA)).status === 404);
const superList = await call('GET', '/branches', null, S);
check('Super Admin sees both branches', superList.data.some((b) => b.branch_id === branchA) && superList.data.some((b) => b.branch_id === branchB));

console.log('Departments -> designations -> employees (Branch A)');
const dev = await call('POST', '/departments', { department_name: 'Development', branch_id: branchB /* must be ignored */ }, TA);
check('Sub Admin creates department; client branch_id is ignored', dev.status === 201 && dev.data.branch_id === branchA, dev.data);
check('Duplicate department name in same branch -> 409', (await call('POST', '/departments', { department_name: 'development' }, TA)).status === 409);
const devB = await call('POST', '/departments', { department_name: 'Development' }, TB);
check('Same department name allowed in another branch', devB.status === 201, devB.data);
const hod = await call('POST', '/designations', { designation_name: 'HOD', department_id: dev.data.department_id }, TA);
const dvr = await call('POST', '/designations', { designation_name: 'Developer', department_id: dev.data.department_id }, TA);
check('Designations created in department', hod.status === 201 && dvr.status === 201, [hod.data, dvr.data]);
check('Sub Admin B cannot add designation to Branch A department', (await call('POST', '/designations', { designation_name: 'Hack', department_id: dev.data.department_id }, TB)).status === 400);
check('Sub Admin B cannot edit Branch A department', (await call('PUT', `/departments/${dev.data.department_id}`, { department_name: 'Hacked' }, TB)).status === 404);
check('Sub Admin B sees no Branch A departments', (await call('GET', '/departments', null, TB)).data.every((d) => d.branch_id === branchB));
check('Sub Admin B sees no Branch A designations', (await call('GET', '/designations', null, TB)).data.length === 0);

const emp = { name: 'Riya Sharma', email: `riya.${run}@smoke.test`, mobile_no: '9000000001', joining_date: '2026-01-15', department_id: dev.data.department_id, designation_id: dvr.data.designation_id };
const e1 = await call('POST', '/users', emp, TA);
check('Employee created with branch/department/designation', e1.status === 201 && e1.data.branch_id === branchA && e1.data.system_role === 'employee', e1.data);
check('Employee requires department + designation', (await call('POST', '/users', { ...emp, email: `n.${run}@smoke.test`, department_id: undefined, designation_id: undefined }, TA)).status === 400);
check('Designation from wrong department rejected', (await call('POST', '/users', { ...emp, email: `m.${run}@smoke.test`, designation_id: (await call('POST', '/designations', { designation_name: 'Tester', department_id: devB.data.department_id }, TB)).data.designation_id }, TA)).status === 400);
check('Sub Admin B cannot use Branch A department for an employee', (await call('POST', '/users', { ...emp, email: `k.${run}@smoke.test` }, TB)).status === 400);
check('Super Admin cannot mix branch B with Branch A department', (await call('POST', '/users', { ...emp, email: `j.${run}@smoke.test`, branch_id: branchB }, S)).status === 400);
const e2 = await call('POST', '/users', { ...emp, email: `sam.${run}@smoke.test`, name: 'Sam', branch_id: branchA }, S);
check('Super Admin can create employee in a branch', e2.status === 201, e2.data);
check('Sub Admin B cannot read/edit Branch A employee', (await call('PUT', `/users/${e1.data.user_id}`, emp, TB)).status === 404);
check('Sub Admin B employee list excludes Branch A people', (await call('GET', '/users', null, TB)).data.every((u) => u.branch_id === branchB));
check('Sub Admin cannot see the Super Admin in the list', !(await call('GET', '/users', null, S)).data.some((u) => u.system_role === 'super_admin'));
const ed = await call('PUT', `/users/${e1.data.user_id}`, { ...emp, name: 'Riya S.' }, TA);
check('Employee can be edited', ed.status === 200 && ed.data.name === 'Riya S.', ed.data);

console.log('Deactivation rules');
check('Cannot deactivate designation in use', (await call('PATCH', `/designations/${dvr.data.designation_id}/status`, { status: 'inactive' }, TA)).status === 409);
check('Cannot deactivate department in use', (await call('PATCH', `/departments/${dev.data.department_id}/status`, { status: 'inactive' }, TA)).status === 409);
check('Employee can be deactivated', (await call('PATCH', `/users/${e1.data.user_id}/status`, { is_active: false }, TA)).data?.is_active === false);
check('Sub Admin cannot deactivate self', (await call('PATCH', `/users/${la.data.user.user_id}/status`, { is_active: false }, TA)).status === 409);
check('Sub Admin user cannot be deactivated from Employees', (await call('PATCH', `/users/${la.data.user.user_id}/status`, { is_active: false }, S)).status === 409);
const d = await call('PATCH', `/branches/${branchB}/status`, { status: 'inactive' }, S);
check('Super Admin deactivates Branch B', d.data?.status === 'inactive', d.data);
check('Inactive branch blocks its Sub Admin (existing token)', (await call('GET', '/departments', null, TB)).status === 403);
check('Inactive branch blocks its Sub Admin login', (await call('POST', '/auth/login', { email: `b.${run}@smoke.test`, password: 'Passw0rdOK' })).status === 403);
check('Cannot create departments in inactive branch', (await call('POST', '/departments', { department_name: 'Sales', branch_id: branchB }, S)).status === 400);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
