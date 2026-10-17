# Bugsbon HRMS (version 1)

React + Vite frontend, Node.js + Express backend, MongoDB + Mongoose database.
Scope: login, branches, departments, designations, employees. (No attendance, leave, payroll, projects or custom permissions yet.)

```
bugsbon-hrms/
├── backend/   Express API + Mongoose models
└── frontend/  React (Vite) admin dashboard
```

## Two different "role" ideas (kept separate on purpose)

| Idea | Where it lives | Values | Purpose |
|------|----------------|--------|---------|
| **System access role** | `users.system_role` | `super_admin`, `sub_admin`, `employee` | Controls what a person may do in the HRMS |
| **Designation (job title)** | `designations` collection, `users.designation_id` | HOD, Developer, Intern, Tester... | Describes someone's position |

### How the Sub Admin is linked to employee data
There is **one `users` collection** for every person. A Sub Admin is simply a user with `system_role = "sub_admin"` whose `branch_id` points to their branch, and the branch points back through `branch_admin_user_id`. Because the login and the employee details are the same record, nobody is duplicated, and a Sub Admin can also be given a department and designation like any other employee. Only Super Admins and Sub Admins have a password; regular employees do not have a login in this version.

## 1. Prerequisites
- Node.js 18 or newer (`node -v`)
- MongoDB running locally ([MongoDB Community](https://www.mongodb.com/try/download/community), installed as a Windows service) **or** a free MongoDB Atlas cluster

If PowerShell says *"running scripts is disabled on this system"* when you run `npm`, run this once:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

## 2. Install dependencies
```powershell
cd bugsbon-hrms\backend
npm install

cd ..\frontend
npm install
```

## 3. Configure the backend (`.env`)
```powershell
cd ..\backend
Copy-Item .env.example .env
notepad .env
```
Fill in these values:

| Variable | What to put |
|----------|-------------|
| `MONGODB_URI` | Local: `mongodb://127.0.0.1:27017/bugsbon_hrms`. Atlas: the connection string from the Atlas "Connect" dialog |
| `JWT_SECRET` | A random string of 32+ characters. Generate one: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `PORT` | `5000` (default) |
| `CLIENT_ORIGIN` | `http://localhost:5173` (default) |
| `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Your first Super Admin. Password: 8+ characters with a letter and a number |

`.env` is git-ignored. Never commit it.

## 4. Create the first Super Admin
```powershell
cd backend
npm run seed:admin
```
It reads the `SEED_ADMIN_*` values from `.env`, stores only a bcrypt hash of the password, and refuses to run twice (if a Super Admin already exists it changes nothing). After it succeeds, delete the `SEED_ADMIN_PASSWORD` line from `.env`.

## 5. Start the backend
```powershell
cd backend
npm run dev
```
You should see `MongoDB connected` and `API running on http://localhost:5000`. Check: <http://localhost:5000/api/health> returns `{"ok":true}`.

## 6. Start the frontend (second PowerShell window)
```powershell
cd frontend
npm run dev
```
Open <http://localhost:5173>. In development, Vite forwards `/api` requests to the backend, so no extra setup is needed.

## 7. Try the workflow
1. **Log in** as the Super Admin you seeded.
2. **Branches** > fill in the branch details and the Sub Admin's name, email, mobile and password > *Create branch*. Create a second branch the same way.
3. Click **Log out**, then log in as the first branch's Sub Admin. The sidebar has no *Branches* item, and only that branch's data is visible.
4. **Departments** > create *Development* and *Testing*.
5. **Designations** > choose *Development* > create *HOD*, *Developer*, *Intern*. Do the same for *Testing*.
6. **Employees** > the Branch is fixed, pick a Department (only this branch's), then a Designation (only that department's) > *Add employee*.
7. Refresh the page: everything is still there (it is stored in MongoDB).
8. Log in as the second branch's Sub Admin: none of the first branch's data appears.

## Automated API check (optional)
With the backend running and a Super Admin seeded, this runs 40+ checks (branch creation, cross-branch blocking, validation, deactivation rules). It creates a few records named `Smoke ...` in your database, so prefer a development database.
```powershell
cd backend
$env:SMOKE_EMAIL="your-super-admin@example.com"
$env:SMOKE_PASSWORD="your-password"
npm run test:smoke
```

## API summary
All routes except `POST /api/auth/login` need `Authorization: Bearer <token>`.

| Route | Who |
|-------|-----|
| `POST /api/auth/login`, `GET /api/auth/me` | everyone |
| `GET /api/branches`, `GET /api/branches/:id` | Super Admin: all. Sub Admin: own branch only |
| `POST /api/branches`, `PUT /api/branches/:id`, `PATCH /api/branches/:id/status` | Super Admin only |
| `GET/POST /api/departments`, `PUT /:id`, `PATCH /:id/status` | both, limited to the Sub Admin's branch |
| `GET/POST /api/designations`, `PUT /:id`, `PATCH /:id/status` | both, limited to the Sub Admin's branch |
| `GET/POST /api/users`, `PUT /:id`, `PATCH /:id/status` | both, limited to the Sub Admin's branch |

## How access is enforced (backend)
- `middleware/auth.js` verifies the token and **reloads the user from the database on every request**, so deactivating an account or branch takes effect immediately.
- A Sub Admin's branch always comes from their account (`req.user.branch_id`). A `branch_id` in the request body or query is ignored for Sub Admins. Records from another branch return *404*.
- `utils/access.js` (`resolveOrgLinks`) checks that branch, department and designation belong together before saving an employee.
- To add custom permissions later, extend `requireRole` in `middleware/auth.js` and the helpers in `utils/access.js`; routes already pass through them.

## Behaviour worth knowing
- **Deactivate, not delete.** Records get `inactive` status. A department/designation cannot be deactivated while active designations or employees still use it. An inactive branch blocks its Sub Admin from logging in and from creating new records.
- **Uniqueness** (case-insensitive): branch name; department name within a branch; designation name within a department; user email.
- A Sub Admin's email, password and branch are changed by the Super Admin on the Branches page (edit the branch).
- Phone numbers accept 7-15 digits with an optional leading `+`.
