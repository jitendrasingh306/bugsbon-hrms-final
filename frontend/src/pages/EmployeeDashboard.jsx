import { useAuth } from '../AuthContext.jsx';
import { formatDate } from '../components/ui.jsx';

const dashboardSections = [
  {
    title: 'My Attendance',
    description: 'View your attendance and check-in/check-out records.',
  },
  {
    title: 'Leave',
    description: 'Apply for leave and check your leave request status.',
  },
  {
    title: 'My Tasks',
    description: 'View tasks assigned to you.',
  },
  {
    title: 'My Projects',
    description: 'View the projects you are working on.',
  },
  {
    title: 'My Salary',
    description: 'View your salary and salary records.',
  },
];

export default function EmployeeDashboard() {
  const { user, logout } = useAuth();

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <h1>My Employee Dashboard</h1>
          <p className="muted">Welcome, {user?.name || 'Employee'}.</p>
        </div>

        <button className="btn" onClick={logout}>
          Log out
        </button>
      </header>

      <section className="card">
        <h2>My Profile</h2>

        <div className="grid">
          <div className="field">
            <label>Name</label>
            <div className="static">{user?.name || '—'}</div>
          </div>

          <div className="field">
            <label>Email</label>
            <div className="static">{user?.email || '—'}</div>
          </div>

          <div className="field">
            <label>Mobile</label>
            <div className="static">{user?.mobile_no || '—'}</div>
          </div>

          <div className="field">
            <label>Joining date</label>
            <div className="static">
              {user?.joining_date ? formatDate(user.joining_date) : '—'}
            </div>
          </div>
        </div>
      </section>

      <section className="grid">
        {dashboardSections.map((section) => (
          <article className="card" key={section.title}>
            <h2>{section.title}</h2>
            <p className="muted">{section.description}</p>
            <p className="muted">
              This section will show your personal records once its API is connected.
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}